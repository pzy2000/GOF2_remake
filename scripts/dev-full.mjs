#!/usr/bin/env node
import { spawn } from "node:child_process";

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();

function spawnChild(label, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {})
    }
  });
  children.add(child);
  child.on("exit", () => children.delete(child));
  child.on("error", (error) => {
    console.error(`[${label}] ${error.message}`);
    shutdown(1);
  });
  return child;
}

function runOnce(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnChild(label, command, args, options);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with ${signal ?? code}`));
    });
  });
}

async function waitForEconomyServer() {
  const healthUrl = "http://127.0.0.1:19777/health";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Keep polling until the server starts listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Economy server did not become ready at ${healthUrl}`);
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  await runOnce("server:build", npmBin, ["run", "server:build"]);
  const server = spawnChild("economy", process.execPath, ["dist-server/economy-server.mjs"], {
    env: { GOF2_ECONOMY_PORT: "19777" }
  });
  await waitForEconomyServer();
  const vite = spawnChild("vite", npmBin, ["run", "dev"], {
    env: { VITE_ECONOMY_API_URL: "http://127.0.0.1:19777" }
  });
  server.on("exit", (code) => shutdown(code ?? 1));
  vite.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
}
