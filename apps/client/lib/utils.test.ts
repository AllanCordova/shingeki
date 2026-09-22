import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cn, formatDuration } from "./utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    assert.equal(cn("a", false, null, "b"), "a b");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds, seconds, and minutes", () => {
    assert.equal(formatDuration(null), "—");
    assert.equal(formatDuration(250), "250 ms");
    assert.equal(formatDuration(1500), "1s");
    assert.equal(formatDuration(125_000), "2m 5s");
  });
});
