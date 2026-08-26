import {GanttItem, PluginSettings} from '../const/types'
import {FrontMatterUtil} from './frontmatter-reader'

export function findPredecessorsAndSuccessors(items: GanttItem[],
                                              pluginSettings: PluginSettings) {

  const filteredEventFiles: Record<string, GanttItem[]> = {}

  items.forEach(item => {
    const filename = item.file.basename
    if (!filteredEventFiles[filename]) filteredEventFiles[filename] = [item]
    else filteredEventFiles[filename]?.push(item)
  })


  items.forEach(item => {

    const {frontMatter} = item
    if (!frontMatter) return

    const predecessors = FrontMatterUtil.getPredecessors(frontMatter, pluginSettings)
    const successors = FrontMatterUtil.getSuccessors(frontMatter, pluginSettings)
    if (!predecessors && !successors) return

    if (predecessors) for (const p of predecessors) if (p) {

      const predecessorFilename = stripObsidianLinkBrackets(p)

      if (predecessorFilename && filteredEventFiles[predecessorFilename])
        filteredEventFiles[predecessorFilename].forEach(predecessorGtItem => {
            if (!predecessorGtItem.successors.includes(item.id))
              predecessorGtItem.successors.push(item.id)
            if (!item.predecessors.includes(predecessorGtItem.id))
              item.predecessors.push(predecessorGtItem.id)
          }
        )

    }

    if (successors) for (const s of successors) if (s) {

      const successorFilename = stripObsidianLinkBrackets(s)

      if (successorFilename && filteredEventFiles[successorFilename]) {
        filteredEventFiles[successorFilename].forEach(successorGtItem => {
            if (!successorGtItem.predecessors.includes(item.id))
              successorGtItem.predecessors.push(item.id)
            if (!item.successors.includes(successorGtItem.id))
              item.successors.push(successorGtItem.id)
          }
        )
      }
    }
  })

}

function stripObsidianLinkBrackets(input: string): string {
  return input.replace(/\[\[|]]/g, "");
}
