import assert from "node:assert/strict";
import { test } from "node:test";
import { pointProgramUpdatePayloadFrom } from "./point-program-settings";

function editForm(expirationMonths?: string) {
  const form = new FormData();
  form.set("name", "Club Café");
  form.set("unitLabel", "granos");
  form.set("active", "true");
  if (expirationMonths !== undefined) form.set("expirationMonths", expirationMonths);
  return form;
}

test("disabling expiration sends an explicit null rather than omitting the property", () => {
  const result = pointProgramUpdatePayloadFrom(editForm("none"));
  assert.ok(result.ok);
  const payload = JSON.parse(JSON.stringify(result.data));
  assert.ok(Object.hasOwn(payload, "expirationMonths"));
  assert.equal(payload.expirationMonths, null);
});

test("editing name, active status or storefronts retains the selected finite period", () => {
  const form = editForm("6");
  form.set("name", "Otro nombre");
  form.set("active", "false");
  form.set("originalStorefrontIds", "old-storefront");
  form.set("storefrontIds", "new-storefront");
  const result = pointProgramUpdatePayloadFrom(form);
  assert.ok(result.ok);
  assert.equal(result.data.expirationMonths, 6);
  assert.equal(result.data.name, "Otro nombre");
  assert.equal(result.data.active, false);
  assert.ok(!Object.hasOwn(result.data, "storefrontIds"));
});

test("a missing expiration selection fails instead of silently clearing dates", () => {
  const result = pointProgramUpdatePayloadFrom(editForm());
  assert.equal(result.ok, false);
});

test("rejects unsupported periods, coercible strings and empty selections", () => {
  for (const value of ["", "null", "undefined", "0", "1", "2", "4", "5", "7", "8", "10", "11", "13", "-3", "3.5", "3.0", "03", " 3 ", "3e0", "Infinity", "NaN"]) {
    const result = pointProgramUpdatePayloadFrom(editForm(value));
    assert.equal(result.ok, false, `must reject ${JSON.stringify(value)}`);
  }
});

test("rejects file values and ambiguous duplicate expiration fields", () => {
  const fileForm = editForm();
  fileForm.set("expirationMonths", new File(["3"], "months.txt"));
  assert.equal(pointProgramUpdatePayloadFrom(fileForm).ok, false);

  const duplicateForm = editForm("6");
  duplicateForm.append("expirationMonths", "none");
  assert.equal(pointProgramUpdatePayloadFrom(duplicateForm).ok, false);
});

test("updates always require a nonempty name", () => {
  for (const name of [null, "", "   ", new File(["Club"], "name.txt")]) {
    const form = editForm("3");
    if (name === null) form.delete("name");
    else form.set("name", name);
    assert.equal(pointProgramUpdatePayloadFrom(form).ok, false);
  }
});

test("optional unit labels can remain absent without dropping expiration", () => {
  const form = editForm("12");
  form.delete("unitLabel");
  const result = pointProgramUpdatePayloadFrom(form);
  assert.ok(result.ok);
  assert.deepEqual(JSON.parse(JSON.stringify(result.data)), {
    name: "Club Café", active: true, expirationMonths: 12,
  });
});
