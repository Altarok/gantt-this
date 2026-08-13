//import FantasyGanttPlugin from '../main'
//
//import {Notice} from 'obsidian'
//
//function addCommandEventFrontMatterPropertiesToFile(plugin: FantasyGanttPlugin) {
//  plugin.addCommand({
//    id: 'add-gantt-frontmatter',
//    name: 'Add all  Gantt properties to current file',
//    editorCallback: async (editor, view) => {
//      const file = view.file
//      if (file?.extension !== 'md') return
//
//      const {
//        frontMatterProperty_gantt_this: file_marker, // boolean
//        frontMatterProperty_event_time_start: lower_date,
//        frontMatterProperty_event_time_end: upper_date,
//        frontMatterProperty_event_name: event_name,
//        frontMatterProperty_event_group: event_group,
//        frontMatterProperty_event_color: event_color,
//        frontMatterProperty_event_symbol: event_symbol,
//        frontMatterProperty_event_calendar: calendar,
//        frontMatterProperty_event_icon_name: icon_name,
//        frontMatterProperty_event_icon_color: icon_color,
//        frontMatterProperty_note_header: note_header
//      } = plugin.settings
//
//
//      // Set properties if they don't already exist
//      await plugin.app.fileManager.processFrontMatter(file, (frontMatter: Record<string, unknown>) => {
//         if (frontMatter[file_marker])
////        frontMatter[file_marker] = frontMatter[file_marker] ?? true
////        frontMatter[lower_date] = frontMatter[lower_date] ?? ''
////        frontMatter[upper_date] = frontMatter[upper_date] ?? ''
////        frontMatter[event_name] = frontMatter[event_name] ?? file.basename
////        frontMatter[event_group] = frontMatter[event_group] ?? 'general'
////        frontMatter[event_color] = frontMatter[event_color] ?? plugin.settings.fallbackColor
////        frontMatter[event_symbol] = frontMatter[event_symbol] ?? 'point|triangle|diamond|pentagon|hexagon or era|bar for timespans'
////        frontMatter[calendar] = frontMatter[calendar] ?? 'gregorian'
////        frontMatter[icon_name] = frontMatter[icon_name] ?? ''
////        frontMatter[icon_color] = frontMatter[icon_color] ?? plugin.settings.fallbackColorForIcons
////        frontMatter[note_header] = frontMatter[note_header] ?? ''
//      }).then(() => {
//        new Notice('Gantt properties added to front-matter.')
//      }).catch(() => {
//        new Notice('Failed to update front-matter.')
//      })
//
//
//    }
//  })
//}
//
////function addCommandCalendarFrontMatterPropertiesToFile(plugin: FantasyGanttPlugin) {
////
////}
////
////function addCommandOpenMarkdownCodeBlock(plugin: FantasyGanttPlugin) {
////
////}
//
//function addAll(plugin: FantasyGanttPlugin) {
//  addCommandEventFrontMatterPropertiesToFile(plugin)
////  addCommandCalendarFrontMatterPropertiesToFile(plugin)
////  addCommandOpenMarkdownCodeBlock(plugin)
//}
//
//export const Commands = {
//  /* To be fne-tuned later */
//  addAll
//}
