import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCardReference } from '../mobile/src/card-reference';

const origin = 'https://tappd.up.railway.app';

test('accepts a Tappd card slug or same-service card URL', () => {
  assert.equal(parseCardReference(' maya-chen_7 ', origin), 'maya-chen_7');
  assert.equal(parseCardReference(`${origin}/c/maya-chen_7`, origin), 'maya-chen_7');
  assert.equal(parseCardReference(`${origin}/c/maya-chen_7/`, origin), 'maya-chen_7');
});

test('rejects unrelated, malformed, or decorated URLs', () => {
  assert.equal(parseCardReference('https://example.com/c/maya', origin), null);
  assert.equal(parseCardReference(`${origin}/other/maya`, origin), null);
  assert.equal(parseCardReference(`${origin}/c/maya?next=https://example.com`, origin), null);
  assert.equal(parseCardReference(`${origin}/c/maya#profile`, origin), null);
  assert.equal(parseCardReference('not a card link', origin), null);
});
