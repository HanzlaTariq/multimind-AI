/** Synthetic employee data, not the user's uploaded private dataset. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultOptions } from '../../lib/readyTools/catalog.mjs';
import { runLocalTool } from '../../lib/readyTools/local.mjs';
import { CREDIT_PREFIX, DEFAULT_POLICY, readyRecipe, priceSteps, receiptFromHold } from '../../lib/automationCredits/pricing.mjs';
const rows = [
  { ID:1, Name:' Example One ', Age:30, City:'City A', Department:'IT', Salary:90000, Joined:'2025-01-01' },
  { ID:2, Name:'Example Two', Age:24, City:'City B', Department:'Support', Salary:60000, Joined:'2025-02-01' },
  { ID:1, Name:' Example One ', Age:30, City:'City A', Department:'IT', Salary:90000, Joined:'2025-01-01' },
];
test('an employee table without a score column quotes three default operations', () => {
  const options = defaultOptions('clean-rank', rows);
  assert.equal(options.rankColumn, '');
  const recipe = readyRecipe('clean-rank', options);
  const costs = Object.fromEntries(recipe.map(step => [CREDIT_PREFIX + step.type, {cost:1}]));
  const quote = priceSteps(recipe, costs, DEFAULT_POLICY);
  assert.equal(quote.total, 3);
  assert.deepEqual(quote.lines.map(step=>step.type), ['ready.cleanRows','data.deduplicate','data.limit']);
});
test('cleaning works without inventing scores and leaves input untouched', () => {
  const before = JSON.stringify(rows);
  const result = runLocalTool('clean-rank',{rows});
  assert.equal(result.rows.length, 2);
  assert.equal(result.excluded.length, 1);
  assert.equal(result.rows[0].Name, 'Example One');
  assert.equal(JSON.stringify(rows), before);
  assert.ok(!('score' in result.rows[0]));
});
test('failure before a step is recorded refunds an unstarted same-cycle hold', () => {
  const receipt = receiptFromHold({key:'regression',scope:'ready-tool',reserved:3,units:[],createdAt:new Date()},{status:'failed',sameCycle:true});
  assert.equal(receipt.charged, 0);
  assert.equal(receipt.refunded, 3);
  assert.equal(receipt.uncertain, false);
});
