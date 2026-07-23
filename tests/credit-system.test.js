import test from "node:test";
import assert from "node:assert/strict";
import { creditCostForTool, consumeCreditsForTool } from "../lib/plans.js";

test("document tools use a predictable credit cost", () => {
  assert.equal(creditCostForTool("compress-pdf"), 1);
  assert.equal(creditCostForTool("convert-spreadsheet"), 1);
  assert.equal(creditCostForTool("convert-document"), 2);
  assert.equal(creditCostForTool("pdf-to-images"), 2);
  assert.equal(creditCostForTool("unknown-tool"), 1);
});

test("consuming credits resets monthly balances and deducts correctly", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const user = {
    plan: "free",
    credits: 3,
    creditsResetAt: new Date("2026-05-20T12:00:00.000Z"),
  };

  const result = consumeCreditsForTool(user, "compress-pdf", now);

  assert.equal(result.canUse, true);
  assert.equal(result.creditsRemaining, 2);
  assert.equal(user.credits, 2);
  assert.equal(user.creditsResetAt.getTime(), now.getTime());
});

test("text to speech cost scales with input length", () => {
  const shortText = "Hello world";
  assert.equal(creditCostForTool("text-to-speech", { text: shortText }), 3);

  const longText = "a".repeat(450);
  assert.equal(creditCostForTool("text-to-speech", { text: longText }), 3);

  const longerText = "a".repeat(800);
  assert.equal(creditCostForTool("text-to-speech", { text: longerText }), 4);
});
