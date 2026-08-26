import {GanttItem} from '../const/types'

export const Experimental = {
  findPredecessorsAndSuccessors
}

function findPredecessorsAndSuccessors(items: GanttItem[]) {

  const filenameToItem: Record<string, GanttItem[]> = {}

  items.forEach(item => {
    const basename = item.file.basename
    if (!filenameToItem[basename]) {
      filenameToItem[basename] = [item]
    } else {
      filenameToItem[basename]?.push(item)
    }
  })


  items.forEach(item => {

    const {frontMatter} = item
    if (!frontMatter) return

    const predecessors = frontMatter.predecessor as string[]
    const successors = frontMatter.successor as string[]
    if (!predecessors && !successors) return

    // console.log(`${item.file.basename} -> [${predecessors?.length ?? '_'}] / [${successors?.length ?? '_'}]`)
    // // console.log(predecessor)
    // // console.log(successor)


    if (predecessors) for (const p of predecessors) if (p) {

      const cleanFilename = stripObsidianLinkBrackets(p)

      if (cleanFilename && filenameToItem[cleanFilename]) {
        filenameToItem[cleanFilename].forEach(ii => {
            ii._successors ??= []
            item._predecessors ??= []

            if (!ii._successors.includes(item.id)) ii._successors.push(item.id)
            if (!item._predecessors.includes(ii.id)) item._predecessors.push(ii.id)
          }
        )
      }
    }

    if (successors) for (const s of successors) if (s) {

      const cleanFilename = stripObsidianLinkBrackets(s)

      if (cleanFilename && filenameToItem[cleanFilename]) {
        filenameToItem[cleanFilename].forEach(ii => {
            ii._predecessors ??= []
            item._successors ??= []

            if (!ii._predecessors.includes(item.id)) ii._predecessors.push(item.id)
            if (!item._successors.includes(ii.id)) item._successors?.push(ii.id)
          }
        )
      }
    }

    /*
     * TODO cleanup duplicates!!
     */

  })

}

function stripObsidianLinkBrackets(input: string): string {
  return input.replace(/\[\[|]]/g, "");
}
