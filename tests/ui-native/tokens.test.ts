import assert from "node:assert/strict";
import test from "node:test";
import { nativeColors } from "../../packages/ui-native/ui-src/tokens";

test("native UI exposes the shared application palette", () => {
  assert.equal(nativeColors.ink, "#08110e");
  assert.equal(nativeColors.mint, "#69e3ad");
});
