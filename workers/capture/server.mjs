import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
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

function armVnc(password) {
  const stored = spawnSync("x11vnc", ["-storepasswd", password, "/tmp/vnc.pass"], {
    stdio: "ignore",
  });
  if (stored.status !== 0) {
    return false;
  }

  if (vncProcess !== null && vncProcess.exitCode === null) {
    vncProcess.kill("SIGTERM");
  }

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
    { stdio: "ignore" },
  );
  next.on("exit", () => {
    if (vncProcess === next) {
      vncProcess = null;
    }
  });
  vncProcess = next;

  return true;
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
  request.on("end", () => {
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

    if (!armVnc(vncPassword)) {
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
      armVnc(randomBytes(16).toString("hex"));
    });
    send(response, 202, { message: "Capture browser started." });
  });
});

server.listen(port, host, async () => {
  await delay(300);
  armVnc(randomBytes(16).toString("hex"));
  console.log(`capture service listening on ${port}`);
});
