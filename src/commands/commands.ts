import FantasyGanttPlugin from '../main'

import {Notice, TFile} from 'obsidian'

/**
 * The plugin's first command adds ALL missing frontmatter properties used by the plugin to the currently open `.md` file.
 * @param plugin
 */
function addCommandEventFrontMatterPropertiesToFile(plugin: FantasyGanttPlugin) {
  plugin.addCommand({
    id: 'add-gantt-frontmatter',
    name: 'Add all Gantt properties to current file',
    editorCallback: async (editor, view) => {
      const file: TFile | null = view.file
      if (file?.extension !== 'md') return

      const {
        frontMatterProperty_gantt_this: file_marker, // boolean / checkbox
        frontMatterProperty_event_time_start: lower_date,
        frontMatterProperty_event_time_end: upper_date,
        frontMatterProperty_event_name: event_name,
        frontMatterProperty_event_calendar: calendar,
        frontMatterProperty_event_group: event_group,
        frontMatterProperty_event_symbol: event_symbol,
        frontMatterProperty_event_color: event_color,
        frontMatterProperty_event_icon_name: icon_name,
        frontMatterProperty_event_icon_color: icon_color,
        frontMatterProperty_note_header: note_header,
        frontMatterProperty_event_predecessors: predecessors,
        frontMatterProperty_event_successors: successors,
        fallbackColor,
        defaultCalendar,
        defaultGroup,
        fallbackColorForIcons
      } = plugin.settings

      await plugin.app.fileManager.processFrontMatter(file, (frontMatter: Record<string, unknown>) => {
        frontMatter[file_marker] = frontMatter[file_marker] ?? true
        frontMatter[lower_date] = frontMatter[lower_date] ?? ''
        frontMatter[upper_date] = frontMatter[upper_date] ?? ''
        frontMatter[event_name] = frontMatter[event_name] ?? file.basename
        frontMatter[event_group] = frontMatter[event_group] ?? defaultGroup
        frontMatter[event_color] = frontMatter[event_color] ?? fallbackColor
        frontMatter[event_symbol] = frontMatter[event_symbol] ?? 'point|triangle|box|diamond|pentagon|star|hexagon|octagon -or- era|bar for timespans'
        frontMatter[calendar] = frontMatter[calendar] ?? defaultCalendar
        frontMatter[icon_name] = frontMatter[icon_name] ?? ''
        frontMatter[icon_color] = frontMatter[icon_color] ?? fallbackColorForIcons
        frontMatter[note_header] = frontMatter[note_header] ?? ''
        frontMatter[predecessors] = frontMatter[predecessors] ?? []
        frontMatter[successors] = frontMatter[successors] ?? []
      }).then(() => {
        new Notice('Gantt properties added to front-matter.')
      }).catch((err: unknown) => {
        new Notice('Failed to update front-matter: ' + String(err))
      })


    }
  })
}

//function addCommandCalendarFrontMatterPropertiesToFile(plugin: FantasyGanttPlugin) {
//
//}
//
//function addCommandOpenMarkdownCodeBlock(plugin: FantasyGanttPlugin) {
//
//}


export const Commands = {
  /* To be fne-tuned later */
  addAll(plugin: FantasyGanttPlugin): void {
    addCommandEventFrontMatterPropertiesToFile(plugin)
    // addCommandCalendarFrontMatterPropertiesToFile(plugin)
    // addCommandOpenMarkdownCodeBlock(plugin)
  }
}
