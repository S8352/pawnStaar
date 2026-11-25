import { describe, expect, it } from 'vitest'

import { QUICK_ZONES, formatCountdown, formatInZone, viewerTimeZone } from '../time'

describe('formatInZone', () => {
  it('formats the epoch as midnight UTC', () => {
    expect(formatInZone(0, 'UTC')).toBe('00:00')
  })

  it('includes the date when asked', () => {
    const formatted = formatInZone(1_795_615_200_000, 'Europe/Zurich', { withDate: true })

    expect(formatted).toContain('15:00')
    expect(formatted).toContain('25 Nov')
  })

  it('shifts the same instant into the viewer zone', () => {
    expect(formatInZone(1_795_615_200_000, 'Asia/Kolkata')).toBe('19:30')
  })
})

describe('viewerTimeZone', () => {
  it('resolves a non-empty zone', () => {
    expect(viewerTimeZone().length).toBeGreaterThan(0)
  })
})

describe('formatCountdown', () => {
  it('reads as starting now once the start time has passed', () => {
    expect(formatCountdown(-1)).toBe('starting now')
  })

  it('reads as starting now at exactly zero', () => {
    expect(formatCountdown(0)).toBe('starting now')
  })

  it('zero-pads the seconds under a minute', () => {
    expect(formatCountdown(5_000)).toBe('0m 05s')
  })

  it('shows minutes and seconds under an hour', () => {
    expect(formatCountdown(1_205_000)).toBe('20m 05s')
  })

  it('shows hours, minutes and seconds under a day', () => {
    expect(formatCountdown(12_005_000)).toBe('3h 20m 05s')
  })

  it('drops the seconds once a day or more remains', () => {
    expect(formatCountdown(98_400_000)).toBe('1d 3h 20m')
  })
})

describe('QUICK_ZONES', () => {
  it('offers IST and US East', () => {
    expect(QUICK_ZONES).toEqual([
      { label: 'IST', timeZone: 'Asia/Kolkata' },
      { label: 'US East', timeZone: 'America/New_York' },
    ])
  })
})
