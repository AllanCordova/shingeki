import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dispatchFailureCopy,
  dispatchStatusLabel,
  dispatchStatusTone,
} from "./attack";

describe("dispatchStatusLabel", () => {
  it("labels completed, failed, and pending scans", () => {
    assert.equal(dispatchStatusLabel("completed"), "Concluído");
    assert.equal(dispatchStatusLabel("failed"), "Falhou");
    assert.equal(dispatchStatusLabel("pending"), "Processando");
  });
});

describe("dispatchFailureCopy", () => {
  it("explains scanner login failures with accents", () => {
    assert.match(
      dispatchFailureCopy("discovery: scanner login failed"),
      /não conseguiu entrar/,
    );
  });

  it("uses generic copy for other failures", () => {
    assert.equal(
      dispatchFailureCopy("chrome missing"),
      "O scan não foi concluído. Tente disparar novamente.",
    );
  });
});

describe("dispatchStatusTone", () => {
  it("maps status to UI tone", () => {
    assert.equal(dispatchStatusTone("completed"), "success");
    assert.equal(dispatchStatusTone("failed"), "danger");
    assert.equal(dispatchStatusTone("pending"), "warning");
  });
});
