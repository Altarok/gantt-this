import FantasyGanttPlugin from '../main'
import {Notice} from "obsidian";

function addCommandEventFrontmatterPropertiesToFile(plugin: FantasyGanttPlugin) {
  plugin.addCommand({
    id: 'add-gantt-frontmatter',
    name: 'Add all  Gantt properties to current file',
    editorCallback: async (editor, view) => {
      const file = view.file
      if (!file || file.extension !== 'md') return

      const {
        frontMatterProperty_gantt_this: file_marker, // boolean
        frontMatterProperty_event_time_start: lower_date,
        frontMatterProperty_event_time_end: upper_date,
        frontMatterProperty_event_name: event_name,
        frontMatterProperty_event_group: event_group,
        frontMatterProperty_event_color: event_color,
        frontMatterProperty_event_symbol: event_symbol,
        frontMatterProperty_event_calendar: calendar,
        frontMatterProperty_event_icon_name: icon_name,
        frontMatterProperty_event_icon_color: icon_color,
        frontMatterProperty_note_header: note_header
      } = plugin.settings

      try {
        // Set properties if they don't already exist
        await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
          frontmatter[file_marker] = frontmatter[file_marker] ?? true
          frontmatter[lower_date] = frontmatter[lower_date] ?? ''
          frontmatter[upper_date] = frontmatter[upper_date] ?? ''
          frontmatter[event_name] = frontmatter[event_name] ?? file.basename
          frontmatter[event_group] = frontmatter[event_group] ?? 'general'
          frontmatter[event_color] = frontmatter[event_color] ?? plugin.settings.fallbackColor
          frontmatter[event_symbol] = frontmatter[event_symbol] ?? 'point|triangle|diamond|pentagon|hexagon or era|bar for timespans'
          frontmatter[calendar] = frontmatter[calendar] ?? 'gregorian'
          frontmatter[icon_name] = frontmatter[icon_name] ?? ''
          frontmatter[icon_color] = frontmatter[icon_color] ?? plugin.settings.fallbackColorForIcons
          frontmatter[note_header] = frontmatter[note_header] ?? ''
        })

        new Notice('Gantt properties added to frontmatter.')
      } catch (error) {
        console.error('Failed to update frontmatter:', error)
        new Notice('Failed to update frontmatter.')
      }
    }
  })


}

function addCommandCalendarFrontmatterPropertiesToFile(plugin: FantasyGanttPlugin) {

}

function addCommandOpenMarkdownCodeBlock(plugin: FantasyGanttPlugin) {

}

function addAll(plugin: FantasyGanttPlugin) {
  addCommandEventFrontmatterPropertiesToFile(plugin)
  addCommandCalendarFrontmatterPropertiesToFile(plugin)
  addCommandOpenMarkdownCodeBlock(plugin)
}

export const Commands = {
  /* To be fne-tuned later */
  addAll
}
