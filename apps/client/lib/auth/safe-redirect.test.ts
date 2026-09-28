import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeAppPath } from "./safe-redirect";

describe("safeAppPath", () => {
  it("keeps in-app relative paths", () => {
    assert.equal(safeAppPath("/projetos/abc"), "/projetos/abc");
  });

  it("rejects protocol-relative and external values", () => {
    assert.equal(safeAppPath("//evil.example"), "/projetos");
    assert.equal(safeAppPath("https://evil.example"), "/projetos");
    assert.equal(safeAppPath("\\windows"), "/projetos");
  });
});
