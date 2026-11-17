import {describe, expect, it} from 'vitest'
import {RedrawOption} from '../src/model/redraw-options'

function assertProperConfig(ro: RedrawOption,
                            resetCalendarCache: boolean,
                            resetDiagnosticCache: boolean,
                            reloadData: boolean,
                            resetZoomAndPan: boolean,
                            changedWidth: boolean,
                            redrawEverything: boolean,
                            changedHeight: boolean) {
  expect(ro.resetCalendarCache).toBe(resetCalendarCache)
  expect(ro.resetDiagnosticCache).toBe(resetDiagnosticCache)
  expect(ro.reloadData).toBe(reloadData)
  expect(ro.resetZoomAndPan).toBe(resetZoomAndPan)
  expect(ro.changedWidth).toBe(changedWidth)
  expect(ro.redrawEverything).toBe(redrawEverything)
  expect(ro.changedHeight).toBe(changedHeight)
}

/**
 * RedrawOption is static data, just test to make sure it does not change.
 */
describe('RedrawOption', () => {

  it(`'Full' should contain all steps and be marked as manual`, () => {
    const ro = RedrawOption.Full

    assertProperConfig(ro, true, true, true, true,
      true, true, true)

    expect(ro.isManual).toBe(true)
  })

  it('ManualReload should contain expected steps and be marked as manual', () => {
    const ro = RedrawOption.ManualReload

    assertProperConfig(ro, true, true, true, false,
      true, true, true)

    expect(ro.isManual).toBe(true)
  })

  it('DataReload should contain expected steps and not be marked as manual', () => {
    const ro = RedrawOption.DataReload

    assertProperConfig(ro, false, false, true, false,
      false, true, true)

    expect(ro.isManual).toBe(false)
  })

  it('ResetView should contain only resetZoomAndPan and be marked as manual', () => {
    const ro = RedrawOption.ResetZoomAndPan

    assertProperConfig(ro, false, false, false, true,
      false, false, false)

    expect(ro.isManual).toBe(true)
  })

  it('Resize should contain only resize and be marked as manual', () => {
    const ro = RedrawOption.ResizeContainer

    assertProperConfig(ro, false, false, false, false,
      true, false, true)

    expect(ro.isManual).toBe(true)
  })

  it('None should contain no steps and be marked as manual', () => {
    const ro = RedrawOption.None

    assertProperConfig(ro, false, false, false, false,
      false, false, false)

    expect(ro.isManual).toBe(true)
  })


  it('Toolbar folding should contain 2 steps and be marked as manual', () => {
    const ro = RedrawOption.HeightChange

    assertProperConfig(ro, false, false, false, false,
      false, false, true)

    expect(ro.isManual).toBe(true)
  })

})

