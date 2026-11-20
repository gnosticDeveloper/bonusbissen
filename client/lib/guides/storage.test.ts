import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { GUIDE_COOKIES, guideKey, markSeen, parseSeen, readSeen, resetSeen, serializeSeen, subscribeSeen } from "./storage";

/** Minimal `document.cookie`: assignments set or expire one cookie, reads join them. */
function installCookieJar() {
  const jar = new Map<string, string>();
  const document = {
    get cookie() {
      return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(assignment: string) {
      const [pair, ...attributes] = assignment.split("; ");
      const [name, value] = pair.split("=");
      if (attributes.includes("max-age=0")) jar.delete(name);
      else jar.set(name, value);
    },
  };
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  return jar;
}

let jar: Map<string, string>;
beforeEach(() => {
  jar = installCookieJar();
});

test("seen keys round-trip through the cookie format", () => {
  const keys = ["home.welcome", "points.search", "home.stats"];
  assert.deepEqual(parseSeen(encodeURIComponent(serializeSeen(keys))), new Set(keys));
});

test("malformed cookie values are dropped instead of trusted", () => {
  assert.deepEqual(parseSeen("%E0%A4%A"), new Set());
  assert.deepEqual(parseSeen(encodeURIComponent("home.welcome,<script>,home,.x,Home.Stats")), new Set(["home.welcome"]));
  assert.deepEqual(parseSeen(undefined), new Set());
});

test("a step added later is unseen while the earlier ones stay seen", () => {
  markSeen("steps", [guideKey("home", "welcome"), guideKey("home", "stats")]);
  const seen = readSeen("steps");
  assert.ok(seen.has("home.welcome") && seen.has("home.stats"));
  assert.equal(seen.has("home.new-feature"), false);
});

test("steps and tips are tracked in separate cookies", () => {
  markSeen("steps", ["home.welcome"]);
  markSeen("tips", ["home.validate"]);
  assert.ok(jar.has(GUIDE_COOKIES.steps) && jar.has(GUIDE_COOKIES.tips));
  assert.equal(readSeen("steps").has("home.validate"), false);
  assert.equal(readSeen("tips").has("home.validate"), true);
});

test("marking accumulates, and only notifies when something changed", () => {
  let notified = 0;
  const unsubscribe = subscribeSeen(() => notified++);
  markSeen("steps", ["home.welcome"]);
  markSeen("steps", ["home.welcome"]);
  markSeen("steps", ["points.search"]);
  unsubscribe();
  assert.equal(notified, 2);
  assert.deepEqual(readSeen("steps"), new Set(["home.welcome", "points.search"]));
});

test("reset forgets steps and tips", () => {
  markSeen("steps", ["home.welcome"]);
  markSeen("tips", ["home.validate"]);
  resetSeen();
  assert.equal(readSeen("steps").size, 0);
  assert.equal(readSeen("tips").size, 0);
});
