import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSeen, serializeSeen, guideKey } from "./storage";
import { findViewGuide, VIEW_GUIDES } from "./views";
import { UserRole } from "@/lib/types/user";

test("every view, step and tip id survives the cookie format and is unique", () => {
  const viewIds = new Set<string>();
  for (const view of VIEW_GUIDES) {
    assert.ok(!viewIds.has(view.id), `duplicate view id ${view.id}`);
    viewIds.add(view.id);
    for (const items of [view.steps, view.tips]) {
      const keys = items.map((item) => guideKey(view.id, item.id));
      assert.equal(new Set(keys).size, keys.length, `duplicate id in ${view.id}`);
      // An id the cookie parser drops would be shown again on every visit.
      assert.deepEqual(parseSeen(encodeURIComponent(serializeSeen(keys))), new Set(keys));
    }
    for (const step of view.steps) {
      if (step.addedOn !== undefined) assert.match(step.addedOn, /^\d{4}-\d{2}-\d{2}$/, `${view.id}.${step.id} addedOn`);
    }
  }
});

test("a role only gets guides for views it can open", () => {
  assert.equal(findViewGuide("/d/abc/clientes", UserRole.CASHIER), null);
  assert.equal(findViewGuide("/d/abc/clientes", UserRole.ADMIN)?.id, "customers");
  assert.equal(findViewGuide("/d/abc/inicio", UserRole.CASHIER)?.id, "home");
});

test("only dashboard views have guides", () => {
  assert.equal(findViewGuide("/d/abc/inicio/", UserRole.ADMIN)?.id, "home");
  assert.equal(findViewGuide("/d/abc/ayuda", UserRole.ADMIN), null);
  assert.equal(findViewGuide("/d/sign-in", UserRole.ADMIN), null);
  assert.equal(findViewGuide("/s/abc/inicio", UserRole.ADMIN), null);
  assert.equal(findViewGuide("/b", UserRole.ADMIN), null);
});
