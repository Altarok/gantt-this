import {RawChartInput} from '../const/types'
import {splitOnce} from '../const/constants'

/**
 * Reads given code block content and returns values in a new copy of the plugin's settings.
 * Used for Markdown code blocks, not Bases.
 *
 * @param currentFolder set to setting values 'eventPath' and 'calendarPath' if their respective value equals 'local'
 * @param source code block content
 */
export function readCodeBlock(currentFolder: string,
                              source: string): RawChartInput {

  const codeBlockContent: RawChartInput = {}

  const lines = source.split('\n')

  for (const line of lines) {
    if (!line.includes(':')) continue
    const trimmed = line.trim()
    if (!trimmed.includes(':')) continue

    const {left: key, right: value} = splitOnce(trimmed, ':')
    if (!key || !value) continue

    switch (key) {
      case 'eventPath':
      case 'calendarPath':
        codeBlockContent[key] = resolvePath(value, currentFolder)
        break
      case 'eventPathSearchRecursive':
      case 'calendarPathSearchRecursive':
        codeBlockContent[key] = parseBoolean(value)
        break
      case 'lowerBoundDate':
      case 'centerHereDate':
      case 'upperBoundDate':
        codeBlockContent[key] = value
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


