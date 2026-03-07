const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const waitOn = require("wait-on");

const DEFAULT_PORT = 5173;
const PORT_SCAN_LIMIT = 20;

function canBindPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function findOpenPort(startPort) {
  const endPort = startPort + PORT_SCAN_LIMIT;

  for (let port = startPort; port <= endPort; port += 1) {
    // Bind test avoids racing against stale processes holding 5173.
    const open = await canBindPort(port);
    if (open) return port;
  }

  throw new Error(`No open port found in range ${startPort}-${endPort}`);
}

function killChild(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
}

async function run() {
  const preferredPort = Number(process.env.VITE_PORT) || DEFAULT_PORT;
  const port = await findOpenPort(preferredPort);
  const devServerUrl = `http://localhost:${port}`;

  console.log(`[dev] Starting renderer on ${devServerUrl}`);

  let shuttingDown = false;
  let electronProcess;
  const viteCliPath = path.join(__dirname, "..", "node_modules", "vite", "bin", "vite.js");

  const viteProcess = spawn(
    process.execPath,
    [viteCliPath, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      stdio: "inherit",
      env: process.env
    }
  );

  viteProcess.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    killChild(electronProcess);
    process.exit(code ?? 0);
  });

  try {
    await waitOn({
      resources: [`tcp:127.0.0.1:${port}`],
      interval: 100,
      timeout: 30000
    });
  } catch {
    shuttingDown = true;
    killChild(viteProcess);
    throw new Error("Vite did not become ready in time");
  }

  electronProcess = spawn(process.execPath, [path.join(__dirname, "run-electron.cjs")], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl
    }
  });

  electronProcess.on("exit", (code) => {
    if (!shuttingDown) {
      shuttingDown = true;
      killChild(viteProcess);
    }
    process.exit(code ?? 0);
  });

  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      killChild(electronProcess);
      killChild(viteProcess);
      process.exit(0);
    });
  });
}

run().catch((error) => {
  console.error(`[dev] ${error.message}`);
  process.exit(1);
});
