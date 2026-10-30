import {describe, expect, it, vi} from 'vitest'
import {GanttRenderEngine} from '../src/view/svg-drawer'
import {CalendarConfig, RuleBasedCalendarConfig} from '../src/types/calendar-types'
import {calculateMoonPositions} from '../src/date-calculations/moon-placing-calc'
import {MockRuleBasedCalendarConfig} from './test-configs'


describe('calculateMoonPositions', () => {
  const createMockEngine = (pixelPerDay = 10): GanttRenderEngine => {
    return {
      getXPosition: vi.fn((day: number) => day * pixelPerDay)
    } as unknown as GanttRenderEngine
  }

  it('returns empty moon draw data if no moons are configured', () => {
    const engine = createMockEngine()
    const config: RuleBasedCalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: []
    }

    const result = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result).toEqual({moonCount: 0, moons: []})
  })

  it('skips moons with invalid cycle or offset parameters', () => {
    const engine = createMockEngine()
    const config: RuleBasedCalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: [
        {cycle: NaN, offset: 0},
        {cycle: 0, offset: 0},
        {cycle: -10, offset: 0},
        {cycle: 30, offset: NaN}
      ]
    }

    const result = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result.moonCount).toBe(4)
    expect(result.moons).toHaveLength(0)
  })

  it('skips rendering if major phases are too crowded below spacing threshold', () => {
    // 1px per day -> quarter cycle (7.5 days) = 7.5px -> half cycle = 15px (< MIN_ICON_SPACING_PX 20)
    const engine = createMockEngine(1)
    const config: CalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: [
        {cycle: 30, offset: 0, color: '#ffffff'}
      ]
    }

    const result = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result.moons).toHaveLength(0)
  })

  it('renders only major phases (New/Full) when zoom level is moderate', () => {
    // 3px per day -> quarter cycle (7.5 days) = 22.5px (>= 20px) -> showQuarterPhases = true,
    // but let's test cycle where half cycle is valid but let's check zoom condition.
    // Wait, with cycle = 30, quarter = 7.5 days. At 3px/day, quarterPixels = 22.5px (> 20px), so quarter phases ARE shown.
    // Let's use cycle = 40, quarter = 10 days, at 2px/day -> quarterPixels = 20px.
    // Let's use cycle = 20, quarter = 5 days, at 3px/day -> quarterPixels = 15px (< 20px), half cycle = 30px (>= 20px).
    const engine = createMockEngine(3)
    const config: CalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: [
        {cycle: 20, offset: 0, color: '#ff0000'}
      ]
    }

    const result = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result.moons).toHaveLength(1)
    expect(result.moons[0].index).toBe(0)
    expect(result.moons[0].color).toBe('#ff0000')

    // Should contain only phases 0 (New) and 2 (Full) because quarterPixels (15px) < 20px
    const phases = result.moons[0].positions.map(p => p.phase)
    expect(phases).toContain(0)
    expect(phases).toContain(2)
    expect(phases).not.toContain(1)
    expect(phases).not.toContain(3)
  })

  it('renders all four phases when zoom level provides enough screen space', () => {
    // cycle = 20 days, 5px/day -> quarterPixels = 25px (>= 20px)
    const engine = createMockEngine(5)
    const config: CalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: [
        {cycle: 20, offset: 0}
      ]
    }

    const result = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result.moons).toHaveLength(1)

    const phases = result.moons[0].positions.map(p => p.phase)
    expect(phases).toContain(0)
    expect(phases).toContain(1)
    expect(phases).toContain(2)
    expect(phases).toContain(3)
  })
})

