import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const token = process.env.CAPTURE_SERVICE_TOKEN?.trim() ?? "";
const port = Number(process.env.CAPTURE_SERVICE_PORT ?? "7900");
const host = process.env.CAPTURE_SERVICE_HOST?.trim() || "0.0.0.0";
const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "capture.mjs");

let child = null;
let vncProcess = null;
let sessionGeneration = 0;

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function stopVnc() {
  if (vncProcess === null || vncProcess.exitCode !== null) {
    vncProcess = null;
    return;
  }
  const current = vncProcess;
  current.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => current.once("exit", resolve)),
    delay(1000),
  ]);
  if (current.exitCode === null) {
    current.kill("SIGKILL");
  }
  vncProcess = null;
}

async function armVnc(password) {
  const stored = spawnSync("x11vnc", ["-storepasswd", password, "/tmp/vnc.pass"], {
    stdio: "ignore",
  });
  if (stored.status !== 0) {
    return false;
  }

  await stopVnc();

  let stderr = "";
  const next = spawn(
    "x11vnc",
    [
      "-display",
      process.env.DISPLAY || ":99",
      "-localhost",
      "-rfbauth",
      "/tmp/vnc.pass",
      "-forever",
      "-shared",
      "-rfbport",
      "5900",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  next.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  next.on("exit", () => {
    if (vncProcess === next) {
      vncProcess = null;
    }
  });
  vncProcess = next;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (next.exitCode !== null) {
      console.error(stderr.trim() || "x11vnc exited before opening port 5900.");
      return false;
    }
    if (await portOpen(5900)) {
      return true;
    }
    await delay(100);
  }

  console.error(stderr.trim() || "x11vnc did not open port 5900.");
  next.kill("SIGTERM");
  return false;
}

function send(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function authorized(request) {
  return token !== "" && request.headers.authorization === `Bearer ${token}`;
}

const server = createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/sessions") {
    send(response, 404, { message: "Not found." });
    return;
  }
  if (!authorized(request)) {
    send(response, 401, { message: "Unauthorized." });
    return;
  }
  if (child !== null) {
    sessionGeneration += 1;
    const previous = child;
    child = null;
    previous.kill("SIGTERM");
  }

  const chunks = [];
  request.on("data", (chunk) => {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 8192) {
      request.destroy();
    }
  });
  request.on("end", async () => {
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      send(response, 422, { message: "Invalid JSON." });
      return;
    }

    const loginUrl = typeof payload.login_url === "string" ? payload.login_url.trim() : "";
    const completeUrl =
      typeof payload.complete_url === "string" ? payload.complete_url.trim() : "";
    const vncPassword = typeof payload.vnc_password === "string" ? payload.vnc_password.trim() : "";
    if (!loginUrl || !completeUrl || !/^[A-Za-z0-9]{16,64}$/.test(vncPassword)) {
      send(response, 422, { message: "login_url, complete_url, and vnc_password are required." });
      return;
    }

    if (!(await armVnc(vncPassword))) {
      send(response, 500, { message: "Could not lock the capture desktop." });
      return;
    }

    const generation = sessionGeneration;
    child = spawn(
      process.execPath,
      [script, "--login-url", loginUrl, "--complete-url", completeUrl],
      {
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ":99" },
        stdio: "inherit",
      },
    );
    child.on("exit", () => {
      if (generation !== sessionGeneration) {
        return;
      }
      child = null;
      void armVnc(randomBytes(16).toString("hex"));
    });
    send(response, 202, { message: "Capture browser started." });
  });
});

server.listen(port, host, async () => {
  const locked = await armVnc(randomBytes(16).toString("hex"));
  if (!locked) {
    console.error("VNC desktop did not start.");
  }
  console.log(`capture service listening on ${port}`);
});
