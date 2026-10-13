import {TFile} from 'obsidian'
import {Consts} from '../const/constants'
import {ChartContext} from '../model/chart-context'

export function getEventFiles(chartCtx: ChartContext): TFile[] {
  const files = readFilesFromFolder(chartCtx.allMarkdownFiles, chartCtx.settings.eventPath, chartCtx.settings.eventPathSearchRecursive);
  if (files?.length === 0) chartCtx.diagnostics.addLog('eventDirEmpty', {dir: chartCtx.settings.eventPath})
  return files
}

export function getCalendarFiles(chartCtx: ChartContext): TFile[] {
  const files = readFilesFromFolder(chartCtx.allMarkdownFiles, chartCtx.settings.calendarPath, chartCtx.settings.calendarPathSearchRecursive);
  if (files?.length === 0) chartCtx.diagnostics.addLog('calendarDirEmpty', {dir: chartCtx.settings.calendarPath})
  return files
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
