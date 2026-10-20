import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeSessionStorage, originOf } from "./state.mjs";

describe("originOf", () => {
  it("returns the origin of an http url", () => {
    assert.equal(originOf("https://alvo.com/login"), "https://alvo.com");
  });

  it("rejects non-http urls", () => {
    assert.equal(originOf("file:///tmp/state.json"), "");
  });
});

describe("mergeSessionStorage", () => {
  it("adds sessionStorage beside the playwright origin", () => {
    const state = mergeSessionStorage(
      {
        cookies: [],
        origins: [
          {
            origin: "https://alvo.com",
            localStorage: [{ name: "auth_token", value: "jwt" }],
          },
        ],
      },
      "https://alvo.com",
      [{ name: "sid", value: "abc" }],
    );

    assert.deepEqual(state.origins[0].sessionStorage, [
      { name: "sid", value: "abc" },
    ]);
    assert.equal(state.origins[0].localStorage[0].name, "auth_token");
  });

  it("ignores empty values", () => {
    const state = { cookies: [], origins: [] };
    assert.equal(mergeSessionStorage(state, "https://alvo.com", []), state);
  });
});
