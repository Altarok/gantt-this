import {Css} from '../const/constants'
import {GanttChartConfig, GanttItem, SvgDrawerData} from '../const/types'
import {setIcon} from 'obsidian'

const iconSize = 16
const iconRadius = iconSize / 2
const textLeftPadding = 3

/*
Element,Default Anchor Point,Positioned By
<g> (Group),"Top-Left (0, 0)","transform=""translate(x, y)"""
<bar>,Top-Left corner,"x, y"
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
    'gt-prevent-user-interactions', {x, y, width: iconSize, height: iconSize}
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

    /* Undefined groups or calendars are accepted! */
    if (grp?.visible === false || cal?.visible === false) return false

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
 * @param text ti display
 * @param x left bound of surrounding svg
 * @param y upper bound of surrounding svg
 * @param width of surrounding svg
 * @param hasIcon moves text to the right if true
 * @param svgContainer
 */
function addTextIfFitting(text: string, x: number, y: number, width: number, hasIcon: boolean, svgContainer: SVGElement): void {
  const textSpacing = textLeftPadding + (hasIcon ? iconSize : 0)
  const availableTextWidth = width - textSpacing

  if (availableTextWidth > 0) {
    const textSvg = createSVGElement('text', Css.item.text, {x: x + textSpacing, y: y + iconRadius + 1})
    textSvg.textContent = truncateText(text, availableTextWidth)
    svgContainer.appendChild(textSvg)
  }
}

/**
 * Draws horizontal bar. SVG rect anchor is top left corner. SVG text anchor is left-middle.
 * @param d event to draw
 * @param x1 left bound of svg to draw
 * @param x2 right bound of svg to draw
 * @param y upper bound of svg to draw
 * @param svgContainer
 */
function drawBar(d: GanttItem, x1: number, x2: number, y: number, svgContainer: SVGElement): void {
  const width = Math.max(2, x2 - x1)

  const bar = createSVGElement('rect', Css.item.bar, {x: x1, y: y, width, 'data-id': d.id})
  if (d.color) bar.setAttribute('fill', d.color)
  svgContainer.appendChild(bar)

  const hasIcon = addIconIfPresent(d, x1, y, svgContainer)
  addTextIfFitting(d.name, x1, y, width, hasIcon, svgContainer)
}

/**
 * Draws horizontal bar with differing height. SVG rect anchor is top left corner. SVG text anchor is left-middle.
 * @param d event to draw
 * @param x1 left bound of svg to draw
 * @param x2 right bound of svg to draw
 * @param y upper bound of svg to draw
 * @param height height of svg to draw
 * @param svgContainer
 */
function drawEra(d: GanttItem, x1: number, x2: number, y: number, height: number, svgContainer: SVGElement): void {
  const width = Math.max(2, x2 - x1)

  const era = createSVGElement('rect', Css.item.era, {x: x1, y, width, height, 'data-id': d.id})
  if (d.color) era.setAttribute('fill', d.color)
  svgContainer.appendChild(era)

  const hasIcon = addIconIfPresent(d, x1, y, svgContainer)
  addTextIfFitting(`Era: ${d.name} (${d.startDateDisplay} - ${d.endDateDisplay})`, x1, y, width, hasIcon, svgContainer)
}

/**
 * SVG circle anchor is dead center.
 * @param d event to draw
 * @param cx horizontal center of svg to draw
 * @param cy vertical center of svg to draw
 * @param svgContainer
 */
function drawPoint(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement): void {
  const circle = createSVGElement('circle', 'gt-item timestamp circle', {cx, cy, 'data-id': d.id})
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
  const polygon = createSVGElement('polygon', 'gt-item timestamp diamond', {points, 'data-id': d.id})
  if (d.color) polygon.setAttribute('fill', d.color)
  svgContainer.appendChild(polygon)
  addIconIfPresent(d, cx - iconRadius, cy - iconRadius, svgContainer)
}

/**
 * SVG bar anchor is top left corner.
 * @param d event to draw
 * @param cx horizontal center of svg to draw
 * @param cy vertical center of svg to draw
 * @param svgContainer
 */
function drawBox(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement): void {
  const rect = createSVGElement('rect', 'gt-item timestamp box', {
    x: cx - iconRadius, y: cy - iconRadius, 'data-id': d.id
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
