import {TFile} from 'obsidian'
import {Consts} from '../const/constants'
import {ChartContext} from '../model/chart-context'

export function getEventFiles(chartCtx: ChartContext): TFile[] {
  return readFilesFromFolder(chartCtx.allMarkdownFiles, chartCtx.settings.eventPath, chartCtx.settings.eventPathSearchRecursive)
}

export function getCalendarFiles(chartCtx: ChartContext): TFile[] {
  return readFilesFromFolder(chartCtx.allMarkdownFiles, chartCtx.settings.calendarPath, chartCtx.settings.calendarPathSearchRecursive)
}

/**
 * @param allFiles all Markdown files
 * @param path human readable path, relative to vault root
 * @param isRecursive if true sub folders get checked
 */
function readFilesFromFolder(allFiles: TFile[], path: string, isRecursive: boolean): TFile[] {
  const pathToSearchIn = normalizeRootPathReference(path)

  return allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''
    if (isRecursive)
      return pathToSearchIn === '' || parentPath === pathToSearchIn || parentPath.startsWith(pathToSearchIn + '/')
    else
      return parentPath === pathToSearchIn
  })
}


function normalizeRootPathReference(path: string): string {
  return path === Consts.ROOT_PATH ? Consts.ROOT_PATH_NORMALIZED : path
}
