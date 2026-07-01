import {CodeBlockContent} from './types'

export function readCodeBlock(currentFolder: string, source: string): CodeBlockContent {

  const codeBlockContent: CodeBlockContent = {
    eventPath: currentFolder,
    calendarDefinitionPath: currentFolder
  }

  const lines = source.split('\n')

  for (const line of lines) {

    const match1 = line.match(/^path: *(.+)$/i)
    if (match1) {
      const pathValue = match1[1].trim().toLowerCase()
      if (pathValue === 'root') {
        codeBlockContent.eventPath = '/'
      } else if (pathValue === 'local') {
        codeBlockContent.eventPath = currentFolder
      } else {
        codeBlockContent.eventPath = match1[1].trim()
      }
    }

    const match2 = line.match(/^calendar-definitions: *(.+)$/i)
    if (match2) {
      const pathValue = match2[1].trim().toLowerCase()
      if (pathValue === 'root') {
        codeBlockContent.calendarDefinitionPath = '/'
      } else if (pathValue === 'local') {
        codeBlockContent.calendarDefinitionPath = currentFolder
      } else {
        codeBlockContent.calendarDefinitionPath = match2[1].trim()
      }
    }


  }

  return codeBlockContent
}
