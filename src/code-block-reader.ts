import {CodeBlockContent} from './types'

export function readCodeBlock(currentFolder: string, source: string): CodeBlockContent {

  const codeBlockContent: CodeBlockContent = {
    eventPath: currentFolder,
    calendarDefinitionPath: currentFolder
  }

  const lines = source.split('\n')

  for (const line of lines) {

    const match1 = /^path: *(.+)$/i.exec(line)
    if (match1) {
      const pathValue = match1[1]?.trim()
      if (pathValue === undefined) {
        codeBlockContent.eventPath = currentFolder
      } else if (pathValue.toLowerCase() === 'root') {
        codeBlockContent.eventPath = '/'
      } else if (pathValue.toLowerCase() === 'local') {
        codeBlockContent.eventPath = currentFolder
      } else {
        codeBlockContent.eventPath = pathValue
      }
    }

    const match2 = /^calendar-definitions: *(.+)$/i.exec(line)
    if (match2) {
      const pathValue = match2[1]?.trim()
      if (pathValue === undefined) {
        codeBlockContent.calendarDefinitionPath = '/'
      } else if (pathValue.toLowerCase() === 'root') {
        codeBlockContent.calendarDefinitionPath = '/'
      } else if (pathValue.toLowerCase() === 'local') {
        codeBlockContent.calendarDefinitionPath = currentFolder
      } else {
        codeBlockContent.calendarDefinitionPath = pathValue
      }
    }


  }

  return codeBlockContent
}
