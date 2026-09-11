import assert from "node:assert/strict";
import test from "node:test";

import { SYSTEM_PROMPT, removeInitialMarkdownHeading } from "./summarize.ts";

test("prompt requires exactly a plain paragraph without Markdown framing", () => {
  assert.match(SYSTEM_PROMPT, /only that paragraph/i);
  assert.match(SYSTEM_PROMPT, /no title, heading, label, Markdown/i);
});

test("removes an initial Markdown heading separated from its paragraph", () => {
  assert.equal(
    removeInitialMarkdownHeading("## Conflict summary\n\nBoth parties disagreed about timing."),
    "Both parties disagreed about timing.",
  );
});

test("preserves content unless the initial heading is unambiguous", () => {
  assert.equal(removeInitialMarkdownHeading("#Not a heading\nDetails"), "#Not a heading\nDetails");
  assert.equal(removeInitialMarkdownHeading("# Title only"), "# Title only");
  assert.equal(removeInitialMarkdownHeading("Context\n\n# A later heading"), "Context\n\n# A later heading");
});
