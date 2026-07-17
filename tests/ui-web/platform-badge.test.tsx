import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlatformBadge } from "../../packages/ui-web/ui-src";

test("web UI badge renders its content and class", () => {
  assert.equal(
    renderToStaticMarkup(
      <PlatformBadge className="platform">Web</PlatformBadge>,
    ),
    '<span class="platform">Web</span>',
  );
});
