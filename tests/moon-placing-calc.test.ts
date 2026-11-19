import {describe, expect, it, vi} from 'vitest'
import {GanttRenderEngine} from '../src/render/svg-drawer'
import {CalendarConfig, RuleBasedCalendarConfig} from '../src/types/calendar-types'
import {calculateMoonPositions} from '../src/date-calculations/moon-placing-calc'
import {MockRuleBasedCalendarConfig} from './test-configs'
import {MoonDrawData, MoonDrawPosition} from "../src/types/moon-types";


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
    const engine = createMockEngine(1)
    const config: CalendarConfig = {
      ...MockRuleBasedCalendarConfig,
      offsetToDayZero: 0,
      moons: [
        {cycle: 10, offset: 0, color: '#ffffff'}
      ]
    }

    const result: MoonDrawData = calculateMoonPositions(engine, config, 0, 100, 0, 100, 1000)
    expect(result.moons).toHaveLength(0)
  })

  it('renders only major phases (New/Full) when zoom level is moderate', () => {
    /*
     * cycle = 20 days, 3px/day -> waxing and waning moons do not get drawn
     *
     * New moon at 0(*3) gets drawn
     * Waxing moon at 5(*3) does not get drawn, since the distance is below 20
     * Full moon at 10(*3) gets drawn
     *
     * First moon at 0, last moon at 300 -> 11 moons
     * X-Positions at [0, 30, 60, ... , 270,  300]
     */

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

    const positions: MoonDrawPosition[] = result.moons[0].positions
    expect(positions.length).toBe(11)

    for (let i = 0; i < 11; i++) {
      const pos = positions[i]
      expect(pos.xPos).toBe(i * 30)
      expect(pos.step).toBe(2 * (i % 2)) /* only phases 0 and 2 (new and full) should get drawn */
      expect(pos.phase).toBe(4) /* constant */
    }
  })

  it('renders all four phases when zoom level provides enough screen space', () => {
    /*
     * cycle = 20 days, 5px/day -> full 4 phases drawn on 100 pixels
     *
     * Render range goes from 0 to 500 -> 5*4(moon phases) + 1 (at end) should get drawn
     *
     * First moon at 0, last moon at 500 -> 21 moons
     * X-Positions at [0, 25, 50, 75, 100, 125, ... , 475, 500]
     */
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

    const positions: MoonDrawPosition[] = result.moons[0].positions
    expect(positions.length).toBe(21)

    for (let i = 0; i < 21; i++) {
      const pos = positions[i]
      expect(pos.xPos).toBe(i * 25)
      expect(pos.step).toBe(i % 4) /* all 4 phases should get drawn (new, waxing, full, waning) */
      expect(pos.phase).toBe(4) /* constant */
    }


  });
})

