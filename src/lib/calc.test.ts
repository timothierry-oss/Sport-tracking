import { test } from 'node:test';
import assert from 'node:assert/strict';
import { epley, repCategory, tonnage, totalReps, intensity, pctChange } from './calc.ts';

test('1RM Epley', () => {
  assert.equal(epley(30, 5), 35);
  assert.equal(epley(40, 1), 40);
  assert.equal(epley(0, 10), 0);
});

test('catégories de reps', () => {
  assert.equal(repCategory(1), 'force');
  assert.equal(repCategory(3), 'force');
  assert.equal(repCategory(4), 'inter');
  assert.equal(repCategory(6), 'inter');
  assert.equal(repCategory(7), 'volume');
  assert.equal(repCategory(15), 'volume');
  assert.equal(repCategory(0), null);
});

test('tonnage et reps, série à vide', () => {
  const sets = [{ load: 20, reps: 5 }, { load: 0, reps: 10 }];
  assert.equal(tonnage(sets), 100);
  assert.equal(totalReps(sets), 15);
});

test('intensité et écart', () => {
  assert.equal(intensity(30, 40), 0.75);
  assert.equal(intensity(0, 40), null);
  assert.equal(pctChange(108, 100), 0.08);
  assert.equal(pctChange(10, 0), null);
});
