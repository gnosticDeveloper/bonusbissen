import assert from "node:assert/strict";
import { test } from "node:test";
import { validateRewardImageDimensions } from "./image-upload";

// Same accept/reject cases as the backend's RewardImageValidationTest.
test("accepts landscape ratios from 1:1 up to 2:1", () => {
  assert.equal(validateRewardImageDimensions(800, 800), null);
  assert.equal(validateRewardImageDimensions(1200, 900), null);
  assert.equal(validateRewardImageDimensions(1920, 1080), null);
  assert.equal(validateRewardImageDimensions(2000, 1000), null);
  assert.equal(validateRewardImageDimensions(4000, 4000), null);
});

test("rejects portrait and wider-than-2:1 images", () => {
  assert.match(validateRewardImageDimensions(900, 1200) ?? "", /relación de aspecto/);
  assert.match(validateRewardImageDimensions(2001, 1000) ?? "", /relación de aspecto/);
  assert.match(validateRewardImageDimensions(3000, 1000) ?? "", /relación de aspecto/);
});

test("rejects images above 4000px on either side", () => {
  assert.match(validateRewardImageDimensions(4001, 3000) ?? "", /4000px/);
  assert.match(validateRewardImageDimensions(3000, 4001) ?? "", /4000px/);
});

test("rejects degenerate dimensions instead of passing them through", () => {
  assert.notEqual(validateRewardImageDimensions(0, 0), null);
  assert.notEqual(validateRewardImageDimensions(100, 0), null);
});
