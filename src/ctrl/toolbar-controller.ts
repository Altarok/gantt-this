import {Platform} from 'obsidian'
import {ToolbarView} from '../views/toolbar-view'
import {GanttRenderEngine} from '../view/svg-drawer'

const panRight = Platform.isMobile ? 0.4 : 0.25
const panLeft = -1 * panRight
const zoomOut = 0.8
const zoomIn = 1.25

export function setToolbarReactions(toolbar: ToolbarView,
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

}
