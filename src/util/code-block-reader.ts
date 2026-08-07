import {CodeBlockContent} from '../const/types'
import {StringUtils} from '../const/constants'

/**
 * Reads given code block content and returns values in a new copy of the plugin's settings.
 *
 * @param currentFolder set to setting values 'eventPath' and 'calendarPath' if their respective value equals 'local'
 * @param source code block content
 */
export function readCodeBlock(currentFolder: string,
                              source: string): CodeBlockContent {

  const codeBlockContent: CodeBlockContent = {calendar: 'gregorian'}

  const lines = source.split('\n').filter(Boolean)

  for (const line of lines) {
    if (!line.contains(':')) continue
    const {left: key, right: value} = StringUtils.splitOnce(line, ':')
    if (!key || !value) continue

    switch (key) {
      case 'eventPath':
        codeBlockContent.eventPath = resolvePath(value, currentFolder)
        break
      case 'calendarPath':
        codeBlockContent.calendarPath = resolvePath(value, currentFolder)
        break
      case 'eventPathSearchRecursive':
        codeBlockContent.eventPathSearchRecursive = parseBoolean(value)
        break
      case 'calendarPathSearchRecursive':
        codeBlockContent.calendarPathSearchRecursive = parseBoolean(value)
        break
      case 'lowerBoundDate':
        codeBlockContent.lowerBoundDate = value
        break
      case 'centerHereDate':
        codeBlockContent.centerHereDate = value
        break
      case 'upperBoundDate':
        codeBlockContent.upperBoundDate = value
        break
      case 'calendarForBounds':
        codeBlockContent.calendar = value
        break
    }
  }

  return codeBlockContent
}

/**
 * Helper to resolve dynamic folder path keywords
 */
function resolvePath(value: string, currentFolder: string): string {
  const normalized = value.toLowerCase()
  if (normalized === 'root') return '/'
  if (normalized === 'local') return currentFolder
  return value
}

/**
 * Helper to parse boolean inputs
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true'
}


