import {describe, expect, it} from 'vitest'
import {RedrawOption} from '../src/model/redraw-options'

/**
 * RedrawOption is static data, just test to make sure it does not change.
 */
describe('RedrawOption', () => {

  it(`'Full' should contain all 6 reset steps and be marked as manual`, () => {
    const ro = RedrawOption.Full

    expect(ro.has('resetCalendarCache')).toBe(true)
    expect(ro.has('resetDiagnosticCache')).toBe(true)
    expect(ro.has('reloadData')).toBe(true)
    expect(ro.has('resetZoomAndPan')).toBe(true)
    expect(ro.has('resize')).toBe(true)
    expect(ro.has('redraw')).toBe(true)

    expect(ro.isManual).toBe(true)
  })

  it('ManualReload should contain expected steps and be marked as manual', () => {
    const ro = RedrawOption.ManualReload

    expect(ro.has('resetCalendarCache')).toBe(true)
    expect(ro.has('resetDiagnosticCache')).toBe(true)
    expect(ro.has('reloadData')).toBe(true)
    expect(ro.has('resetZoomAndPan')).toBe(false)
    expect(ro.has('resize')).toBe(true)
    expect(ro.has('redraw')).toBe(true)

    expect(ro.isManual).toBe(true)
  })

  it('DataReload should contain expected steps and not be marked as manual', () => {
    const ro = RedrawOption.DataReload

    expect(ro.has('resetCalendarCache')).toBe(false)
    expect(ro.has('resetDiagnosticCache')).toBe(false)
    expect(ro.has('reloadData')).toBe(true)
    expect(ro.has('resetZoomAndPan')).toBe(false)
    expect(ro.has('resize')).toBe(false)
    expect(ro.has('redraw')).toBe(true)

    expect(ro.isManual).toBe(false)
  })

  it('ResetView should contain only resetZoomAndPan and be marked as manual', () => {
    const ro = RedrawOption.ResetView

    expect(ro.has('resetCalendarCache')).toBe(false)
    expect(ro.has('resetDiagnosticCache')).toBe(false)
    expect(ro.has('reloadData')).toBe(false)
    expect(ro.has('resetZoomAndPan')).toBe(true)
    expect(ro.has('resize')).toBe(false)
    expect(ro.has('redraw')).toBe(false)

    expect(ro.isManual).toBe(true)
  })

  it('Resize should contain only resize and be marked as manual', () => {
    const ro = RedrawOption.Resize

    expect(ro.has('resetCalendarCache')).toBe(false)
    expect(ro.has('resetDiagnosticCache')).toBe(false)
    expect(ro.has('reloadData')).toBe(false)
    expect(ro.has('resetZoomAndPan')).toBe(false)
    expect(ro.has('resize')).toBe(true)
    expect(ro.has('redraw')).toBe(false)

    expect(ro.isManual).toBe(true)
  })

  it('None should contain no steps and be marked as manual', () => {
    const ro = RedrawOption.None

    expect(ro.has('resetCalendarCache')).toBe(false)
    expect(ro.has('resetDiagnosticCache')).toBe(false)
    expect(ro.has('reloadData')).toBe(false)
    expect(ro.has('resetZoomAndPan')).toBe(false)
    expect(ro.has('resize')).toBe(false)
    expect(ro.has('redraw')).toBe(false)

    expect(ro.isManual).toBe(true)
  })

  it('generates correct toString representation', () => {

    expect(RedrawOption.Full.toString()).toBe('RedrawOption: [resetCalendarCache, resetDiagnosticCache, reloadData, resetZoomAndPan, resize, redraw]')
    expect(RedrawOption.ManualReload.toString()).toBe('RedrawOption: [resetCalendarCache, resetDiagnosticCache, reloadData, resize, redraw]')
    expect(RedrawOption.DataReload.toString()).toBe('RedrawOption: [reloadData, redraw]')
    expect(RedrawOption.ResetView.toString()).toBe('RedrawOption: [resetZoomAndPan]')
    expect(RedrawOption.Resize.toString()).toBe('RedrawOption: [resize]')
    expect(RedrawOption.None.toString()).toBe('RedrawOption: []')
  })

})

