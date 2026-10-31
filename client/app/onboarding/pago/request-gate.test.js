import { describe, expect, test } from "bun:test";
import { MAX_AUTOMATIC_CHECKS, PollBudget, RequestGate } from "./request-gate";

describe("operaciones del flujo de billing", () => {
  test("no superpone consultas, checkout, selección ni logout", async () => {
    const gate = new RequestGate();
    let finish;
    let requests = 0;
    const first = gate.run(async () => {
      requests += 1;
      await new Promise(resolve => { finish = resolve; });
    });
    expect(await gate.run(async () => { requests += 1; })).toBe(false);
    expect(requests).toBe(1);
    finish();
    await first;
    expect(await gate.run(async () => { requests += 1; })).toBe(true);
    expect(requests).toBe(2);
  });

  test("desmontar invalida respuestas pendientes e impide nuevos pedidos", async () => {
    const gate = new RequestGate();
    let finish;
    let updates = 0;
    const pending = gate.run(async signal => {
      await new Promise(resolve => { finish = resolve; });
      if (!signal.aborted) updates += 1;
    });
    gate.abort();
    finish();
    await pending;
    expect(updates).toBe(0);
    expect(await gate.run(async () => { updates += 1; })).toBe(false);
  });

  test("un error libera el bloqueo sin repetir la operación", async () => {
    const gate = new RequestGate();
    await expect(gate.run(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(await gate.run(async () => {})).toBe(true);
  });

  test("polling y retorno de foco comparten un presupuesto finito", () => {
    const budget = new PollBudget();
    for (let i = 0; i < MAX_AUTOMATIC_CHECKS; i += 1) expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(false);
    expect(budget.take()).toBe(false);
  });
});
