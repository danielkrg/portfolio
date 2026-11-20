import { describe, it, expect } from 'vitest';

// Proves the Vitest runner is wired up in the @client/photos package.
describe('@client/photos test runner', () => {
  it('runs a trivial test', () => {
    expect(true).toBe(true);
  });
});
