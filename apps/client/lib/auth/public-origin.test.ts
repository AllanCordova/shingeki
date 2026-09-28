import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicOrigin } from "./public-origin";

function request(url: string, headers: Record<string, string> = {}) {
  return { url, headers: new Headers(headers) };
}

describe("publicOrigin", () => {
  it("prefers the configured public site over the container bind address", () => {
    const previous = process.env.PUBLIC_URL;
    process.env.PUBLIC_URL = "https://shingeki.com.br";
    try {
      assert.equal(
        publicOrigin(request("http://0.0.0.0:3000/api/auth/google")),
        "https://shingeki.com.br",
      );
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_URL;
      else process.env.PUBLIC_URL = previous;
    }
  });

  it("uses the forwarded host when the request url is the bind address", () => {
    const previous = process.env.PUBLIC_URL;
    delete process.env.PUBLIC_URL;
    try {
      assert.equal(
        publicOrigin(
          request("http://0.0.0.0:3000/login", {
            "x-forwarded-host": "shingeki.com.br",
            "x-forwarded-proto": "https",
          }),
        ),
        "https://shingeki.com.br",
      );
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_URL;
      else process.env.PUBLIC_URL = previous;
    }
  });

  it("keeps localhost in local development", () => {
    const previous = process.env.PUBLIC_URL;
    delete process.env.PUBLIC_URL;
    try {
      assert.equal(
        publicOrigin(request("http://127.0.0.1:3000/login")),
        "http://127.0.0.1:3000",
      );
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_URL;
      else process.env.PUBLIC_URL = previous;
    }
  });
});
