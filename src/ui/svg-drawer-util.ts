import {Css} from '../const/constants'
import {GanttChartConfig, GanttItem, SvgDrawerData} from '../const/types'
import {setIcon} from 'obsidian'

const iconSize = 16
const iconRadius = iconSize / 2
const textLeftPadding = 3

/*
Element,Default Anchor Point,Positioned By
<g> (Group),"Top-Left (0, 0)","transform=""translate(x, y)"""
<rect>,Top-Left corner,"x, y"
<circle>,Center,"cx, cy"
<text>,Bottom-Left baseline (by default),"x, y"
 */

export const Util = {
  createSVGElement,
  filterActivelyShownEventData: filterActiveEventData,

  drawBar,
  drawEra,

  drawPoint,
  drawBox,
  drawDiamond,
  drawVerticalLine
}

function setAttributes(el: Element,
                       attrs: Record<string, string | number>): void {

  for (const key in attrs) {
    const val = attrs[key]
    if (val !== undefined && val !== null) {
      el.setAttribute(key, String(val))
    }
  }
}

function createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K,
                                                                cssClass?: string,
                                                                attrs?: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = window.createSvg(tag)
  if (cssClass) el.setAttribute('class', cssClass)
  if (attrs) setAttributes(el, attrs)
  return el
}

function createIconInDiv(d: GanttItem): HTMLDivElement {
  const iconContainerDiv = window.createDiv({cls: 'gt-item point-icon-external'})
  if (d.displayIconColor) iconContainerDiv.style.color = d.displayIconColor
  if (d.displayIcon) setIcon(iconContainerDiv, d.displayIcon)
  return iconContainerDiv
}

/**
 * @param d event to draw icon for
 * @param x x-coordinate of upper-left corner of svg
 * @param y y-coordinate of upper-left corner of svg
 * @param container
 */
function addIconIfPresent(d: GanttItem,
                          x: number, y: number,
                          container: SVGElement): boolean {
  if (!d.displayIcon) return false

  const foreignObj = createSVGElement('foreignObject',
    'gt-prevent-user-interactions',
    {x, y, width: iconSize, height: iconSize}
  )
  foreignObj.appendChild(createIconInDiv(d))
  container.appendChild(foreignObj)
  return true
}

function filterActiveEventData(rawData: GanttItem[],
                               svgDrawerData: SvgDrawerData,
                               ganttChartConfig: GanttChartConfig): GanttItem[] {
  const {mappedGrpConfigs, mappedCalConfigs} = svgDrawerData

  return rawData.filter(d => {
    const grp = mappedGrpConfigs[d.group]
    const cal = mappedCalConfigs[d.calendarType]

    if ((grp && !grp.visible) || (cal && !cal.visible)) return false

    switch (d.displayType) {
      case 'era':
        return ganttChartConfig.showEras
      case 'bar':
        return ganttChartConfig.showBars
      case 'box':
      case 'diamond':
      case 'point':
      case 'vertical-line':
        return ganttChartConfig.showPoints
      default:
        return false
    }
  })
}

function truncateText(text: string, maxWidth: number, charWidthEstimate = 7): string {
  const maxChars = Math.floor(maxWidth / charWidthEstimate)
  if (text.length <= maxChars) return text
  if (maxChars <= 3) return '...'
  return text.substring(0, maxChars - 3) + '...'
}

/**
 * Draws horizontal bar. SVG rect anchor is top left corner. SVG text anchor is left-middle.
 * @param d event to draw
 * @param x1 lower horizontal bound of svg to draw
 * @param x2 upper horizontal bound of svg to draw
 * @param cy vertical center of svg to draw, method converts to top left corner
 * @param svgContainer
 */
function drawBar(d: GanttItem, x1: number, x2: number, cy: number, svgContainer: SVGElement): void {

  const barWidth = Math.max(2, x2 - x1)

  // Css.item.bar
  const rect = createSVGElement('rect', 'gt-item timespan bar', {
    x: x1, y: cy - iconRadius, width: barWidth,
    'data-id': d.id
  })
  if (d.color) rect.setAttribute('fill', d.color)
  svgContainer.appendChild(rect)

  const hasIcon = addIconIfPresent(d, x1, cy - iconRadius, svgContainer)
  const textSpacing = textLeftPadding + (hasIcon ? iconSize : 0)
  const availableTextWidth = barWidth - textSpacing

  if (availableTextWidth > 0) {
    const text = createSVGElement('text', 'gt-item timespan bar text', {
      x: x1 + textSpacing, y: cy, 'data-id': d.id
    })
    text.textContent = truncateText(d.name, availableTextWidth)
    svgContainer.appendChild(text)
  }
}

/**
 * Draws horizontal bar with differing height. SVG rect anchor is top left corner. SVG text anchor is left-middle.
 * @param d event to draw
 * @param x1 lower horizontal bound of svg to draw
 * @param x2 upper horizontal bound of svg to draw
 * @param y upper vertical bound of svg to draw
 * @param height height of svg to draw
 * @param svgContainer
 */
function drawEra(d: GanttItem, x1: number, x2: number, y: number, height: number, svgContainer: SVGElement): void {

  const width = Math.max(2, x2 - x1)

  const era = createSVGElement('rect', Css.item.era, {x: x1, y, width, height})
  if (d.color) era.setAttribute('fill', d.color)
  svgContainer.appendChild(era)

  const hasIcon = addIconIfPresent(d, x1, y, svgContainer)
  const iconSpacing = hasIcon ? iconSize + 4 : 0

  const textLeftPadding = 6
  const textX = x1 + (hasIcon ? iconSpacing : textLeftPadding)
  const availableTextWidth = width - (hasIcon ? iconSpacing : textLeftPadding)

  if (availableTextWidth > 0) {
    const text = createSVGElement('text', Css.item.eraText)
    text.setAttribute('x', textX.toString())
    text.setAttribute('y', (era.getAttribute('y')!).toString())
    text.textContent = truncateText(`Era: ${d.name} (${d.startDateDisplay} - ${d.endDateDisplay})`, availableTextWidth)
    svgContainer.appendChild(text)
  }

}

/**
 * SVG circle anchor is dead center.
 * @param d event to draw
 * @param cx horizontal center of svg to draw
 * @param cy vertical center of svg to draw
 * @param svgContainer
 */
function drawPoint(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement): void {
  const circle = createSVGElement('circle', 'gt-item timestamp circle', {
    cx, cy, 'data-id': d.id // 'circle' center is center
  })
  if (d.color) circle.setAttribute('fill', d.color)
  svgContainer.appendChild(circle)

  addIconIfPresent(d, cx - iconRadius, cy - iconRadius, svgContainer)
}

/**
 * SVG polygon anchor is dead center.
 * @param d event to draw
 * @param cx horizontal center of svg to draw, keep as is for 'polygon'
 * @param cy vertical center of svg to draw, keep as is for 'polygon'
 * @param svgContainer
 */
function drawDiamond(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement): void {
  const points = `${cx},${cy - iconRadius} ${cx + iconRadius},${cy} ${cx},${cy + iconRadius} ${cx - iconRadius},${cy}`
  const polygon = createSVGElement('polygon', 'gt-item timestamp circle', {
    points, // 'polygon' center is center
    'data-id': d.id
  })
  if (d.color) polygon.setAttribute('fill', d.color)
  svgContainer.appendChild(polygon)
  addIconIfPresent(d, cx - iconRadius, cy - iconRadius, svgContainer)
}

/**
 * SVG rect anchor is top left corner.
 * @param d event to draw
 * @param cx horizontal center of svg to draw
 * @param cy vertical center of svg to draw
 * @param svgContainer
 */
function drawBox(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement): void {
  const rect = createSVGElement('rect', 'gt-item timestamp box', {
    x: cx - iconRadius,
    y: cy - iconRadius,
    'data-id': d.id
  })
  if (d.color) rect.setAttribute('fill', d.color)
  svgContainer.appendChild(rect)
  addIconIfPresent(d, cx - iconRadius, cy - iconRadius, svgContainer)
}

/**
 * Draws vertical line, ignoring icons.
 * SVG lines have no anchor, they just define start and end point.
 * @param d event to draw
 * @param x1 horizontal center of svg to draw
 * @param y1 upper vertical bound of svg to draw
 * @param y2 lower vertical bound of svg to draw
 * @param width width of svg to draw
 * @param svgContainer
 */
function drawVerticalLine(d: GanttItem, x1: number, y1: number, y2: number, width: number, svgContainer: SVGElement): void {
  const line = createSVGElement('line', Css.item.line, {x1, x2: x1, y1, y2, 'stroke-width': width, 'data-id': d.id})
  if (d.color) line.setAttribute('stroke', d.color)
  svgContainer.appendChild(line)
}
