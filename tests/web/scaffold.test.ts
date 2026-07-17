import assert from "node:assert/strict";
import test from "node:test";

test("web test group is configured", () => {
  assert.equal(typeof document, "undefined");
});
