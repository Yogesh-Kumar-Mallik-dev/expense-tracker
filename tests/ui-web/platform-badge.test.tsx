import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge } from "../../packages/ui-web/ui-src/src/reui";

test("ReUI badge renders its content and semantic tone", () => {
  assert.equal(
    renderToStaticMarkup(<Badge tone="success">Synced</Badge>),
    '<span class="reui-badge is-success">Synced</span>',
  );
});
