import {Platform} from 'obsidian'
import {ToolbarView} from '../views/toolbar-view'
import {GanttRenderEngine} from '../view/svg-drawer'

const panStep = Platform.isMobile ? 0.4 : 0.25

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
  toolbar.panLeftButton?.addEventListener('click', () => renderEngine.panLeft(panStep))
  toolbar.zoomOutButton?.addEventListener('click', () => renderEngine.zoomOut())
  toolbar.resetZoomAndPanButton.addEventListener('click', () => renderEngine.resetZoom())
  toolbar.zoomInButton?.addEventListener('click', () => renderEngine.zoomIn())
  toolbar.panRightButton?.addEventListener('click', () => renderEngine.panRight(panStep))
  toolbar.settingsButton.addEventListener('click', () => toolbar.handleSettingsButtonClick())

}
