import {GanttItem} from '../const/types'

export const Experimental = {
  findPredecessorsAndSuccessors
}

function findPredecessorsAndSuccessors(items: GanttItem[]) {

  const filenameToItem: Record<string, GanttItem[]> = {}

  items.forEach(item => {
    if (!filenameToItem[item.file.basename]) filenameToItem[item.file.basename] = [item]
    else filenameToItem[item.file.basename]!.push(item)
  })

  // debugger

  items.forEach(item => {

    const {frontMatter} = item
    if (!frontMatter) return

    const predecessor = frontMatter.predecessor as string[]
    const successor = frontMatter.successor as string[]
    if (!predecessor && !successor) return


    // console.log(`${item.file.basename} -> [${predecessor?.length ?? '_'}] / [${successor?.length ?? '_'}]`)
    // // console.log(predecessor)
    // // console.log(successor)

    if (predecessor) for (const p of predecessor) if (p) {
      // const filename = p

    }


  })


  // debugger

}
