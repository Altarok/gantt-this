import {Platform} from 'obsidian'
import {ToolbarView} from './toolbar-view'
import {GanttRenderEngine} from './svg-drawer'

const panStep = Platform.isMobile ? 0.4 : 0.25

export function setToolbarReactions(tv: ToolbarView,
                                    renderEngine: GanttRenderEngine,
                                    refreshChartCallback: () => void) {

  tv.reloadButton.addEventListener('click', () => refreshChartCallback())
  tv.toggleBarsButton.addEventListener('click', () => renderEngine.toggleShowBars(tv.handleToggleBarsButtonClick()))
  tv.toggleTimestampButton.addEventListener('click', () => renderEngine.toggleShowPoints(tv.handleToggleTimestampsButtonClick()))
  tv.toggleEventGroupingButton.addEventListener('click', () => renderEngine.toggleGrouping(tv.handleToggleGroupingButtonClick()))
  tv.panLeftButton?.addEventListener('click', () => renderEngine.panLeft(panStep))
  tv.zoomOutButton?.addEventListener('click', () => renderEngine.zoomOut())
  tv.resetZoomAndPanButton.addEventListener('click', () => renderEngine.resetZoom())
  tv.zoomInButton?.addEventListener('click', () => renderEngine.zoomIn())
  tv.panRightButton?.addEventListener('click', () => renderEngine.panRight(panStep))
  tv.settingsButton.addEventListener('click', () =>  tv.handleSettingsButtonClick()   )

}
