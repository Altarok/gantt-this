import {Platform} from 'obsidian'
import {ToolbarView} from '../views/toolbar-view'
import {GanttRenderEngine} from '../view/svg-drawer'
import {ChartDiagnosticsModal} from '../views/chart-diagnostics-modal'
import FantasyGanttPlugin from '../main'
import {ChartContext} from '../model/chart-context'

const panRight = Platform.isMobile ? 0.4 : 0.25
const panLeft = -1 * panRight
const zoomOut = 0.8
const zoomIn = 1.25

/**
 * Binds click event listeners and interactive reactions to the Gantt chart toolbar buttons.
 *
 * @param plugin - The main Fantasy Gantt plugin instance.
 * @param chartContext - The current chart context and configuration.
 * @param toolbar - The toolbar view containing interactive UI elements.
 * @param renderEngine - The Gantt render engine handling visual updates, panning, and zooming.
 * @param refreshChartCallback - Callback function triggered to reload or refresh the chart.
 */
export function setToolbarReactions(plugin: FantasyGanttPlugin,
                                    chartContext: ChartContext,
                                    toolbar: ToolbarView,
                                    renderEngine: GanttRenderEngine,
                                    refreshChartCallback: () => void) {

  toolbar.reloadButton.addEventListener('click', () => refreshChartCallback())
  toolbar.toggleBarsButton.addEventListener('click', () => {
      toolbar.handleToggleBarsButtonClick()
      renderEngine.updateViewAfterToggle()
    }
  )
  toolbar.toggleTimestampButton.addEventListener('click', () => {
      toolbar.handleToggleTimestampsButtonClick()
      renderEngine.updateViewAfterToggle()
    }
  )
  toolbar.toggleEventGroupingButton.addEventListener('click', () => {
      toolbar.handleToggleGroupingButtonClick()
      renderEngine.updateViewAfterToggle()
    }
  )
  toolbar.panLeftButton?.addEventListener('click', () => renderEngine.panRelative(panLeft))
  toolbar.zoomOutButton?.addEventListener('click', () => renderEngine.zoom(zoomOut))
  toolbar.resetZoomAndPanButton.addEventListener('click', () => renderEngine.resetZoom())
  toolbar.zoomInButton?.addEventListener('click', () => renderEngine.zoom(zoomIn))
  toolbar.panRightButton?.addEventListener('click', () => renderEngine.panRelative(panRight))
  toolbar.settingsButton.addEventListener('click', () => toolbar.handleSettingsButtonClick())

  toolbar.debugInfoButton?.addEventListener('click', () => new ChartDiagnosticsModal(plugin, chartContext).open())

  toolbar.foldButton.addEventListener('click', () => toolbar.fold())
  toolbar.unfoldButton.addEventListener('click', () => toolbar.unfold())

}
