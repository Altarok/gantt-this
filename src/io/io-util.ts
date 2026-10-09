import {TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Consts} from '../const/constants'
import {GanttChartSources} from '../const/types'

export function getEventFiles(plugin: FantasyGanttPlugin,
                              settingsContext: GanttChartSources): TFile[] {
  return readFilesFromFolder(plugin, settingsContext.eventPath, settingsContext.eventPathSearchRecursive)
}

export function getCalendarFiles(plugin: FantasyGanttPlugin,
                                 settingsContext: GanttChartSources): TFile[] {
  return readFilesFromFolder(plugin, settingsContext.calendarPath, settingsContext.calendarPathSearchRecursive)
}

/**
 * @param plugin
 * @param path human readable path, relative to vault root
 * @param isRecursive if true sub folders get checked
 */
function readFilesFromFolder(plugin: FantasyGanttPlugin, path: string, isRecursive: boolean): TFile[] {
  const allFiles: TFile[] = getAllMarkdownFiles(plugin)
  const pathToSearchIn = normalizeRootPathReference(path)

  return allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''
    if (isRecursive)
      return pathToSearchIn === '' || parentPath === pathToSearchIn || parentPath.startsWith(pathToSearchIn + '/')
    else
      return parentPath === pathToSearchIn
  })
}

function getAllMarkdownFiles(plugin: FantasyGanttPlugin) {
  return plugin.app.vault.getMarkdownFiles()
}

function normalizeRootPathReference(path: string): string {
  return path === Consts.ROOT_PATH ? Consts.ROOT_PATH_NORMALIZED : path
}
