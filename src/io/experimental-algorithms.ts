import {GanttItem} from '../const/types'

export const Experimental = {
  findPredecessorsAndSuccessors
}

function findPredecessorsAndSuccessors(items: GanttItem[]) {

  const filenameToItem: Record<string, GanttItem[]> = {}

  items.forEach(item => {
    const basename = item.file.basename
    // debugger
    if (!filenameToItem[basename]) {
      filenameToItem[basename] = [item]
    } else {
      filenameToItem[basename]!.push(item)
    }
  })

  // debugger

  items.forEach(item => {

    const {frontMatter} = item
    if (!frontMatter) return

    const predecessors = frontMatter.predecessor as string[]
    const successors = frontMatter.successor as string[]
    if (!predecessors && !successors) return

    console.log(`${item.file.basename} -> [${predecessors?.length ?? '_'}] / [${successors?.length ?? '_'}]`)
    // // console.log(predecessor)
    // // console.log(successor)

    // debugger

    if (predecessors) for (const p of predecessors) if (p) {

      const cleanFilename = stripObsidianLinkBrackets(p)

      if (cleanFilename && filenameToItem[cleanFilename]) {
        filenameToItem[cleanFilename].forEach(ii => {
            ii._successors?.push(item.id)
            item._predecessors?.push(ii.id)
          }
        )
      }
    }

    if (successors) for (const s of successors) if (s) {

      const cleanFilename = stripObsidianLinkBrackets(s)

      if (cleanFilename && filenameToItem[cleanFilename]) {
        filenameToItem[cleanFilename].forEach(ii => {
            ii._predecessors?.push(item.id)
            item._successors?.push(ii.id)
          }
        )
      }
    }

    // debugger

  })

}

function stripObsidianLinkBrackets(input: string): string {
  return input.replace(/\[\[|]]/g, "");
}
