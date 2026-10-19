// import {createSvg} from '../view/svg-drawer-util'
import {GanttChartView} from '../views/gantt-chart-view'
import {Platform} from "obsidian";

const diff = 2
type Point = { x: number, y: number }

export class GanttConnectorDrawer {
  private activeArrows: SVGElement[] = []
  private readonly offsetContainer: DOMRect
  private readonly targetContainer: DOMRect
  private readonly scrollableContainer: HTMLElement | null = null

  constructor(private readonly view: GanttChartView) {
    this.offsetContainer = view.eventLayer.getBoundingClientRect()
    this.targetContainer = view.upperHoverLayer.getBoundingClientRect()
    this.scrollableContainer = view.getScrollableContainer(Platform.isMobile)
  }

  drawCurvedArrow(fromEl: SVGElement | HTMLElement, toEl: SVGElement | HTMLElement) {
    // const containerRect = this.offsetContainer.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    console.log('offsetContainer', this.offsetContainer)
    console.log('targetContainer', this.targetContainer)
    console.log('fromRect', fromRect)
    console.log('toRect', toRect)

    debugger

    let startPoint: Point
    let endPoint: Point

    if (Math.abs(fromRect.y - toRect.y) < 1) {
      startPoint = centerOfRightBound(this.offsetContainer, fromRect)
      endPoint = centerOfLeftBound(this.offsetContainer, toRect)
    } else if (fromRect.bottom > toRect.top) {
      startPoint = centerOfLowerBound(this.offsetContainer, fromRect)
      endPoint = centerOfLeftBound(this.offsetContainer, toRect)
    } else { // if (fromRect.top < toRect.bottom) {
      startPoint = centerOfUpperBound(this.offsetContainer, fromRect)
      endPoint = centerOfLeftBound(this.offsetContainer, toRect)
    }

    // 1. Calculate relative anchor points (e.g., right edge of source to left edge of target)
    const startX = startPoint.x + (this.targetContainer.x - this.offsetContainer.x)
    const startY = startPoint.y + (this.targetContainer.y - this.offsetContainer.y)
      - (this.scrollableContainer?.scrollTop ?? 0)

    const endX = endPoint.x + (this.targetContainer.x - this.offsetContainer.x)
    const endY = endPoint.y + (this.targetContainer.y - this.offsetContainer.y)
      - (this.scrollableContainer?.scrollTop ?? 0)

    debugger

    // 2. Control points for smooth horizontal S-curve (cubic bezier)
    const dx = Math.abs(endX - startX) * 0.5
    const cp1X = startX + dx
    const cp1Y = startY
    const cp2X = endX - dx
    const cp2Y = endY

    const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`

    // 3. Create path
    const path = this.view.upperHoverLayer.createSvg('path', {
      cls: 'gt-dependency-arrow', attr: {
        d: pathData, fill: 'none', 'marker-end': 'url(#gt-arrow-head)' // SVG marker definition
      }
    })

    this.activeArrows.push(path)
  }

  clearArrows() {
    this.activeArrows.forEach(arrow => arrow.remove())
    this.activeArrows = []
  }
}


function centerOfLowerBound(containerRect: DOMRect, eventShape: DOMRect): Point {
  return {
    x: eventShape.x + (eventShape.width / 2) - containerRect.x
    ,
    y: eventShape.y - diff - containerRect.y
  }
}

function centerOfUpperBound(containerRect: DOMRect, eventShape: DOMRect): Point {
  return {
    x: eventShape.x + (eventShape.width / 2) - containerRect.x
    ,
    y: eventShape.bottom + diff - containerRect.y
  }
}

function centerOfLeftBound(containerRect: DOMRect, eventShape: DOMRect): Point {
  return {
    x: eventShape.x - diff - containerRect.x
    ,
    y: eventShape.y + (eventShape.height / 2) - containerRect.y
  }
}

function centerOfRightBound(containerRect: DOMRect, eventShape: DOMRect): Point {
  return {
    x: eventShape.right + diff // - containerRect.x
    ,
    y: eventShape.y + (eventShape.height / 2) - containerRect.y
  }
}
