import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dispatchFailureCopy,
  dispatchStatusLabel,
  dispatchStatusTone,
  sessionExpiredCopy,
} from "./attack";

describe("dispatchStatusLabel", () => {
  it("labels completed, failed, pending, and expired scans", () => {
    assert.equal(dispatchStatusLabel("completed"), "Concluído");
    assert.equal(dispatchStatusLabel("failed"), "Falhou");
    assert.equal(dispatchStatusLabel("pending"), "Processando");
    assert.equal(dispatchStatusLabel("session_expired"), "Sessão expirada");
    assert.equal(dispatchStatusLabel("cancelled"), "Cancelado");
  });
});

describe("dispatchFailureCopy", () => {
  it("explains an old scanner login failure without asking for a password", () => {
    assert.match(
      dispatchFailureCopy("discovery: scanner login failed"),
      /Capture o estado do navegador/,
    );
  });

  it("uses generic copy for other failures", () => {
    assert.equal(
      dispatchFailureCopy("chrome missing"),
      "O scan não foi concluído. Tente disparar novamente.",
    );
  });
});

describe("sessionExpiredCopy", () => {
  it("tells the operator to capture the browser again", () => {
    assert.match(sessionExpiredCopy(), /Capture o navegador de novo/);
  });
});

describe("dispatchStatusTone", () => {
  it("maps status to UI tone", () => {
    assert.equal(dispatchStatusTone("completed"), "success");
    assert.equal(dispatchStatusTone("failed"), "danger");
    assert.equal(dispatchStatusTone("pending"), "warning");
    assert.equal(dispatchStatusTone("session_expired"), "warning");
    assert.equal(dispatchStatusTone("cancelled"), "neutral");
  });
});
