// import {createSvg} from '../view/svg-drawer-util'
import {GanttChartView} from '../views/gantt-chart-view'

const diff = 2
type Point = { x: number, y: number }

export class GanttConnectorDrawer {
  private activeArrows: SVGElement[] = []
  private readonly eventContainer: DOMRect
  private readonly arrowContainer: DOMRect
  private readonly scrollableContainer: HTMLElement | null = null

  constructor(private readonly view: GanttChartView,
              isMobile: boolean) {
    this.eventContainer = view.eventLayer.getBoundingClientRect()
    this.arrowContainer = view.upperHoverLayer.getBoundingClientRect()
    this.scrollableContainer = view.getScrollableContainer(isMobile)
  }

  drawCurvedArrow(fromEl: SVGElement | HTMLElement, toEl: SVGElement | HTMLElement) {
    // const containerRect = this.offsetContainer.getBoundingClientRect()
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    const toolbarHeight = this.view.toolbarContainer.clientHeight - 36

    let startPoint: Point
    let endPoint: Point

    if (Math.abs(fromRect.y - toRect.y) < 1) {
      /* [from] in same lane as [to] */
      startPoint = centerOfRightBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    } else if (fromRect.top > toRect.bottom) {
      /* [from] below [to] */
      startPoint = centerOfUpperBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    } else {
      /* [from] above [to] */
      startPoint = centerOfLowerBound(fromRect)
      endPoint = centerOfLeftBound(toRect)
    }

    const scrollTop = this.scrollableContainer?.scrollTop ?? 0

    // 1. Calculate relative anchor points (e.g., right edge of source to left edge of target)
    const startX = startPoint.x + (this.arrowContainer.x - 2 * this.eventContainer.x)
    const startY = startPoint.y + (this.arrowContainer.y - 2 * this.eventContainer.y) + scrollTop - toolbarHeight

    // console.log(`const startX ${startX} = ${startPoint.x} + (${this.arrowContainer.x} - 2 * ${this.eventContainer.x})`)
    // console.log(`const startY ${startY} = ${startPoint.y} + (${this.arrowContainer.y} - 2 * ${this.eventContainer.y}) + ${scrollTop} - ${toolbarHeight}`)

    const endX = endPoint.x + (this.arrowContainer.x - 2 * this.eventContainer.x)
    const endY = endPoint.y + (this.arrowContainer.y - 2 * this.eventContainer.y) + scrollTop - toolbarHeight

    const arrowPathData = createBezierCurve(startX, startY, endX, endY)
    this.drawArrow(arrowPathData)
  }


  /** Draw arrow and cache it to be able to delete it. */
  private drawArrow(pathData: string) {
    const arrow = this.view.upperHoverLayer.createSvg('path', {
      cls: 'gt-dependency-arrow', attr: {d: pathData, fill: 'none', 'marker-end': 'url(#gt-arrow-head)'}
    })
    this.activeArrows.push(arrow)
  }

  clearArrows() {
    this.activeArrows.forEach(arrow => arrow.remove())
    this.activeArrows = []
  }
}

function centerOfLowerBound(eventShape: DOMRect): Point {
  return {x: eventShape.left + (eventShape.width / 2), y: eventShape.bottom + diff}
}

function centerOfUpperBound(eventShape: DOMRect): Point {
  return {x: eventShape.left + (eventShape.width / 2), y: eventShape.top - diff}
}

function centerOfLeftBound(eventShape: DOMRect): Point {
  return {x: eventShape.left - diff, y: eventShape.top + (eventShape.height / 2)}
}

function centerOfRightBound(eventShape: DOMRect): Point {
  return {x: eventShape.right + diff, y: eventShape.top + (eventShape.height / 2)}
}

/** Create control points for smooth horizontal S-curve (cubic bezier). */
function createBezierCurve(startX: number, startY: number, endX: number, endY: number) {
  const dx = Math.abs(endX - startX) * 0.5
  return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`
}
