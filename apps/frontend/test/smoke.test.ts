import { describe, expect, it } from 'vitest'

// Smoke test only, to exercise the vitest config end-to-end. Delete this
// once real tests exist for the WCC feature (later task).
describe('vitest smoke test', () => {
  it('asserts basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })
})
