import {Util} from '../view/svg-drawer-util'


type Point = { x: number, y: number }


export class GanttConnectorDrawer {
  private activeArrows: SVGElement[] = []

  drawCurvedArrow(fromEl: SVGElement | HTMLElement, toEl: SVGElement | HTMLElement, containerSvg: SVGElement) {
    const containerRect = containerSvg.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    let startPoint: Point
    let endPoint: Point

    if (fromRect.bottom > toRect.top) {
      startPoint = centerOfLowerBound(containerRect, fromRect)
      endPoint = centerOfLeftBound(containerRect, toRect)
    }


    // 1. Calculate relative anchor points (e.g., right edge of source to left edge of target)
    const startX = fromRect.left - containerRect.left + fromRect.width / 2
    const startY = fromRect.top + fromRect.height / 2 - containerRect.top

    const endX = toRect.left - containerRect.left
    const endY = toRect.top + toRect.height / 2 - containerRect.top


    // 2. Control points for smooth horizontal S-curve (cubic bezier)
    const dx = Math.abs(endX - startX) * 0.5
    const cp1X = startX + dx
    const cp1Y = startY
    const cp2X = endX - dx
    const cp2Y = endY

    const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`

    // 3. Create path
    const path = Util.createSvg('path', 'gt-dependency-arrow', {
      d: pathData,
      fill: 'none',
      'marker-end': 'url(#gt-arrow-head)' // SVG marker definition
    })

    containerSvg.appendChild(path)
    this.activeArrows.push(path)
  }

  clearArrows() {
    this.activeArrows.forEach(arrow => arrow.remove())
    this.activeArrows = []
  }
}


function centerOfLowerBound(containerRect: DOMRect, rect: DOMRect): Point {
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top + rect.height / 2 - containerRect.top
  }
}

function centerOfLeftBound(containerRect: DOMRect, rect: DOMRect): Point {
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top + rect.height / 2 - containerRect.top
  }
}

