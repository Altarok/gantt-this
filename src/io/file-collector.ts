import {TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {CodeBlockContent, PluginSettings} from '../const/types'
import {Consts} from '../const/constants'
import {FrontMatterUtil} from './frontmatter-reader'

export function getFilteredFiles(plugin: FantasyGanttPlugin,
                                 pluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent): TFile[] {
  const allFiles = plugin.app.vault.getMarkdownFiles()

  let eventSourcePath = codeBlockContent.eventPath ?? pluginSettings.eventPath
  /* Normalize root path reference */
  if (eventSourcePath === Consts.ROOT_PATH) eventSourcePath = Consts.ROOT_PATH_NORMALIZED

  const filesInCorrectPath = allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''

    if (codeBlockContent.eventPathSearchRecursive ?? pluginSettings.eventPathSearchRecursive)
      return eventSourcePath === '' || parentPath === eventSourcePath || parentPath.startsWith(eventSourcePath + Consts.DIR_SEPARATOR)
    else
      return parentPath === eventSourcePath
  })

  const {frontMatterProperty_gantt_this_optional} = plugin.settings

  return filesInCorrectPath.filter(f => {
    const cache = plugin.app.metadataCache.getFileCache(f)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) return false

    if (frontMatterProperty_gantt_this_optional)
      return true
    else
      return FrontMatterUtil.isFileMarkedAsEvent(frontMatter, plugin.settings)
  })
}
