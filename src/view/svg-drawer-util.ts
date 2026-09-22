import {setIcon} from "obsidian"
import {GanttItem, PluginSettings} from '../const/types'
import {Css} from "const/constants"
import {ManualSvg} from "./manual-svg-icons"

const textLeftPadding = 3


const moonSvgs: Record<number, DocumentFragment> = {
  0: ManualSvg.newMoon,
  1: ManualSvg.crescentHalfMoon,
  2: ManualSvg.fullMoon,
  3: ManualSvg.waningHalfMoon
}

function setAttributes(el: Element, attrs: Record<string, string | number>): void {
  for (const key in attrs) {
    const val = attrs[key]
    if (val !== undefined && val !== null)
      el.setAttribute(key, String(val))
  }
}

export function createSvg<K extends keyof SVGElementTagNameMap>(tag: K,
                                                                cssClass?: string,
                                                                attrs?: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = window.createSvg(tag)
  if (cssClass) el.setAttribute('class', cssClass)
  if (attrs) setAttributes(el, attrs)
  return el
}

export class SvgDrawerUtil {
  private readonly shapeSize: number // default 16
  private readonly shapeRadius: number // 8
  private readonly iconSize: number // 16
  private readonly iconRadius: number // 8

  constructor(private readonly settings: PluginSettings) {
    this.shapeSize = settings.viewEventShapeHeight
    this.shapeRadius = this.shapeSize / 2
    this.iconSize = settings.viewEventIconHeight
    this.iconRadius = this.iconSize / 2
  }

  createIconInDiv(d: GanttItem): HTMLDivElement {
    const iconContainerDiv = window.createDiv({cls: 'gt-item icon-container'})
    if (d.displayIconColor) iconContainerDiv.style.setProperty('--gt-icon-color', d.displayIconColor)
    if (d.displayIcon) setIcon(iconContainerDiv, d.displayIcon)
    return iconContainerDiv
  }

  /**
   * @param d event to draw icon for
   * @param x x-coordinate of upper-left corner of svg
   * @param y y-coordinate of upper-left corner of svg
   * @param container
   */
  addIconIfPresent(d: GanttItem,
                   x: number, y: number,
                   container: SVGElement): boolean {
    if (!d.displayIcon) return false

    const foreignObj = createSvg('foreignObject',
      'gt-prevent-user-interactions', {x, y, width: this.iconSize, height: this.iconSize}
    )
    foreignObj.appendChild(this.createIconInDiv(d))
    container.appendChild(foreignObj)
    return true
  }

  truncateText(text: string, maxWidth: number, charWidthEstimate = 7): string {
    const maxChars = Math.floor(maxWidth / charWidthEstimate)
    if (text.length <= maxChars) return text
    if (maxChars <= 3) return '...'
    return text.substring(0, maxChars - 3) + '...'
  }

  /**
   * @param text to display
   * @param x left bound of surrounding svg
   * @param y upper bound of surrounding svg
   * @param width of surrounding svg
   * @param hasIcon moves text to the right if true
   * @param svgContainer
   * @param textCssClass necessary to decide which CSS magic to apply
   */
  addTextIfFitting(text: string, x: number, y: number, width: number, hasIcon: boolean, svgContainer: SVGElement,
                   isTimeSpan: boolean, textCssClass: string): void {
    const textSpacing = textLeftPadding + (hasIcon ? this.iconSize : 0)
    const availableTextWidth = width - textSpacing

    if (availableTextWidth > 0) {
      const textSvg = createSvg('text', textCssClass, {x: x + textSpacing, y})
      textSvg.textContent = this.truncateText(text, availableTextWidth)
      svgContainer.appendChild(textSvg)
    }
  }

  /**
   * Draws horizontal bar. SVG rect anchor is top left corner. SVG text anchor is left-middle.
   * @param d event to draw
   * @param x1 left bound of svg to draw
   * @param x2 right bound of svg to draw
   * @param y vertical center of svg to draw
   * @param svgContainer
   */
  drawBar(d: GanttItem, x1: number, x2: number, y: number, svgContainer: SVGElement): void {
    const width = Math.max(2, x2 - x1)

    const bar = createSvg('rect', Css.item.bar, {
      x: x1,
      y: y - this.shapeRadius,
      width,
      height: this.shapeSize,
      'data-id': d.id
    })
    if (d.color) bar.setAttribute('fill', d.color)
    svgContainer.appendChild(bar)

    if (width > this.iconSize) {
      const hasIcon = this.addIconIfPresent(d, x1, y - this.iconRadius, svgContainer)
      if (width > 2 * this.iconSize) this.addTextIfFitting(d.name, x1, y, width, hasIcon, svgContainer, true, Css.item.textBar)
    }
  }

  /**
   * Draws horizontal bar with differing height. SVG rect anchor is top left corner. SVG text anchor is left-middle.
   * @param d event to draw
   * @param x1 left bound of svg to draw
   * @param x2 right bound of svg to draw
   * @param y vertical center of svg to draw
   * @param height height of svg to draw
   * @param svgContainer
   */
  drawEra(d: GanttItem, x1: number, x2: number, y: number, height: number, svgContainer: SVGElement): void {
    const width = Math.max(2, x2 - x1)

    const era = createSvg('rect', Css.item.era, {x: x1, y: y, width, height, 'data-id': d.id})
    if (d.color) era.setAttribute('fill', d.color)
    svgContainer.appendChild(era)

    if (width > this.iconSize) {
      const hasIcon = this.addIconIfPresent(d, x1, y, svgContainer)
      const text = `${d.name}` // `Era: ${d.name} (${d.startDateDisplay} - ${d.endDateDisplay})`
      if (width > 2 * this.iconSize) this.addTextIfFitting(text, x1, y + this.iconRadius, width, hasIcon, svgContainer, true, Css.item.textEra)
    }
  }

  /**
   * Draw small shape for event with a single timestamp (box|circle|diamond). Appends event color to SVG background and adds lucide icon on top if.
   * @param d event to draw
   * @param shape 'circle' | 'polygon' | 'rect'
   * @param attrs
   * @param x center of svg
   * @param y center of svg
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   * @param cssClass
   */
  private drawSmallShape(d: GanttItem,
                         shape: "circle" | "polygon" | "rect",
                         attrs: Record<string, string | number>,
                         x: number,
                         y: number,
                         svgContainer: SVGElement,
                         availableWidth: number,
                         cssClass: string = Css.item.timestamp): void {
    const el = createSvg(shape, cssClass, {...attrs, 'data-id': d.id})
    if (d.color) el.setAttribute('fill', d.color)
    svgContainer.appendChild(el)
    this.addIconIfPresent(d, x - this.iconRadius, y - this.iconRadius, svgContainer)

    const textX = x + this.iconRadius
    this.addTextIfFitting(d.name, textX, y, availableWidth, false, svgContainer, false, Css.item.textTimestamp)
  }

  /**
   * Draw box for timestamp event. SVG bar anchor is top left corner.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawBox(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    this.drawSmallShape(d, 'rect', {
      x: cx - this.shapeRadius,
      y: cy - this.shapeRadius,
      width: this.shapeSize, height: this.shapeSize
    }, cx, cy, svgContainer, availableWidth, Css.item.box)
  }

  /**
   * Draw diamond for timestamp event. SVG polygon anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw, keep as is for 'polygon'
   * @param cy vertical center of svg to draw, keep as is for 'polygon'
   * @param svgContainer
   * @param availableWidth distance from this event to the next one to the right, use for description
   */
  drawDiamond(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 4)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
  }

  /**
   * Draw circle for timestamp event. SVG circle anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawPoint(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    this.drawSmallShape(d, 'circle', {
      cx,
      cy,
      r: this.shapeRadius
    }, cx, cy, svgContainer, availableWidth)
  }

  /**
   * Draw triangle for timestamp event. SVG circle anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawTriangle(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 3)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
  }

  /**
   * Draw pentagon for timestamp event. SVG circle anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawPentagon(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 5)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
  }

  drawStar(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 10, 0.382)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
  }

  /**
   * Draw hexagon for timestamp event. SVG circle anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawHexagon(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 6)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
  }

  /**
   * Draw octagon for timestamp event. SVG circle anchor is dead center.
   * @param d event to draw
   * @param cx horizontal center of svg to draw
   * @param cy vertical center of svg to draw
   * @param svgContainer
   * @param availableWidth calculated width from this event to the next one to the right, used for event description
   */
  drawOctagon(d: GanttItem, cx: number, cy: number, svgContainer: SVGElement, availableWidth: number): void {
    const points = this.calculatePolygonPoints(cx, cy, 8, 1, 1 / 8)
    this.drawSmallShape(d, 'polygon', {points}, cx, cy, svgContainer, availableWidth)
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
  drawVerticalLine(d: GanttItem, x1: number, y1: number, y2: number, width: number, svgContainer: SVGElement): void {
    const line = createSvg('line', Css.item.timestamp, {
      x1, x2: x1, y1, y2, 'stroke-width': this.settings.uxVerticalLineEventWidth, 'data-id': d.id
    })
    if (d.color) line.setAttribute('stroke', d.color)
    svgContainer.appendChild(line)

    // const availableWidth = 200 // Or calculate based on container bounds/remaining width
    // addTextIfFitting(d.name, x1, y2 - iconRadius, availableWidth, false, svgContainer, false)
  }

  /**
   * Calculate the points for a regular polygon inscribed in a circle.
   * Returns a string suitable for SVG polygon points attribute.
   *
   * @param cx - X coordinate of the center
   * @param cy - Y coordinate of the center
   * @param numCorners - Number of corners/vertices of the polygon
   * @param altRadiusFactor - alternative radius factor for more complex forms (e.g. stars)
   * @param additionalRotation - alternative rotation for more complex forms (e.g. octagon)
   * @param additionalShapeRadius - use to increase radius
   * @returns String in format 'x1,y1 x2,y2 x3,y3 ...' suitable for SVG polygon points
   *          The first point is always at (cx, cy + radius)
   */
  calculatePolygonPoints(cx: number,
                         cy: number,
                         numCorners: number,
                         altRadiusFactor = 1,
                         additionalRotation = 0,
                         additionalShapeRadius = 0): string {

    const points: string[] = []

    /*
     * Start angle: 90 degrees (π/2 radians) to make first point at top (x, y+r)
     * value chosen to make triangle and pentagon point up
     */
    const startAngle = -Math.PI / 2 + Math.PI * additionalRotation

    for (let i = 0; i < numCorners; i++) {
      /* Calculate angle for this vertex (going clockwise) */
      const angle = startAngle - (2 * Math.PI * i / numCorners)

      const iterRad = (i % 2 === 0) ? 1 : altRadiusFactor

      /* Calculate x and y coordinates */
      const x = cx + (this.shapeRadius + additionalShapeRadius) * Math.cos(angle) * iterRad
      const y = cy + (this.shapeRadius + additionalShapeRadius) * Math.sin(angle) * iterRad

      points.push(`${x},${y}`)
    }

    return points.join(' ')
  }
}


/**
 * Renders a moon phase SVG icon at the specified center coordinates (cx, cy).
 *
 * @param cx Center X position (usually xPos of the tick)
 * @param cy Center Y position (e.g. -12 to sit right above baseline Y=0)
 * @param phase Phase index (0 to 4)
 * @param color
 * @param moonIndex
 * @param moonCount
 * @param svgContainer The SVG parent group element (e.g. ticksG or individualAxisG)
 */
export function drawMoonPhase(cx: number,
                              cy: number,
                              phase: number,
                              moonIndex: number,
                              moonCount: number,
                              svgContainer: SVGElement,
                              color?: string): void {
  const innerContent = moonSvgs[phase]
  if (!innerContent) return

  const iconSize = Math.max(19 - moonCount, 12)
  const halfSize = iconSize / 2
  const x = cx - halfSize
  const yOffset = moonCount > 1 ? 14 * (moonIndex / (moonCount - 1)) : 0
  const y = cy - halfSize + yOffset

  const g = createSvg('svg', 'moon-phase-icon', {
    width: iconSize, height: iconSize, viewBox: `0 0 24 24`, x, y
  })

  if (color) g.style.color = color

  g.appendChild(innerContent.cloneNode(true)) // do not use g.innerHTML = innerContent
  svgContainer.appendChild(g)
}


// function setAttributes(el: Element,
//                        attrs: Record<string, string | number>): void {
//
//   for (const key in attrs) {
//     const val = attrs[key]
//     if (val !== undefined && val !== null) {
//       el.setAttribute(key, String(val))
//     }
//   }
// }
//
// function createSvg<K extends keyof SVGElementTagNameMap>(tag: K,
//                                                          cssClass?: string,
//                                                          attrs?: Record<string, string | number>): SVGElementTagNameMap[K] {
//   const el = window.createSvg(tag)
//   if (cssClass) el.setAttribute('class', cssClass)
//   if (attrs) setAttributes(el, attrs)
//   return el
// }
//
// function createIconInDiv(d: GanttItem): HTMLDivElement {
//   const iconContainerDiv = window.createDiv({cls: 'gt-item icon-container'})
//   if (d.displayIconColor) iconContainerDiv.style.setProperty('--gt-icon-color', d.displayIconColor)
//   if (d.displayIcon) setIcon(iconContainerDiv, d.displayIcon)
//   return iconContainerDiv
// }
//
// /**
//  * @param d event to draw icon for
//  * @param x x-coordinate of upper-left corner of svg
//  * @param y y-coordinate of upper-left corner of svg
//  * @param iconSize width and height of svg to draw
//  * @param container
//  */
// function addIconIfPresent(d: GanttItem,
//                           x: number, y: number, iconSize: number,
//                           container: SVGElement): boolean {
//   if (!d.displayIcon) return false
//
//   const foreignObj = createSvg('foreignObject',
//     'gt-prevent-user-interactions', {x, y, width: iconSize, height: iconSize}
//   )
//   foreignObj.appendChild(createIconInDiv(d))
//   container.appendChild(foreignObj)
//   return true
// }
//
// function truncateText(text: string, maxWidth: number, charWidthEstimate = 7): string {
//   const maxChars = Math.floor(maxWidth / charWidthEstimate)
//   if (text.length <= maxChars) return text
//   if (maxChars <= 3) return '...'
//   return text.substring(0, maxChars - 3) + '...'
// }
//
// /**
//  * @param text to display
//  * @param x left bound of surrounding svg
//  * @param y upper bound of surrounding svg
//  * @param width of surrounding svg
//  * @param hasIcon moves text to the right if true
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param textCssClass necessary to decide which CSS magic to apply
//  */
// function addTextIfFitting(text: string, x: number, y: number, width: number, iconSize: number, hasIcon: boolean, svgContainer: SVGElement,
//                           isTimeSpan: boolean, textCssClass: string): void {
//   const textSpacing = textLeftPadding + (hasIcon ? iconSize : 0)
//   const availableTextWidth = width - textSpacing
//
//   if (availableTextWidth > 0) {
//     const textSvg = createSvg('text', textCssClass, {x: x + textSpacing, y})
//     textSvg.textContent = truncateText(text, availableTextWidth)
//     svgContainer.appendChild(textSvg)
//   }
// }
//
// /**
//  * Draws horizontal bar. SVG rect anchor is top left corner. SVG text anchor is left-middle.
//  * @param d event to draw
//  * @param x1 left bound of svg to draw
//  * @param x2 right bound of svg to draw
//  * @param y vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  */
// function drawBar(d: GanttItem, x1: number, x2: number, y: number, iconSize: number, svgContainer: SVGElement): void {
//   const iconRadius = iconSize / 2
//   const width = Math.max(2, x2 - x1)
//
//   const bar = createSvg('rect', Css.item.bar, {x: x1, y: y - iconRadius, width, height: iconSize, 'data-id': d.id})
//   if (d.color) bar.setAttribute('fill', d.color)
//   svgContainer.appendChild(bar)
//
//   if (width > iconSize) {
//     const hasIcon = addIconIfPresent(d, x1, y - iconRadius, iconSize, svgContainer)
//     if (width > 2 * iconSize) addTextIfFitting(d.name, x1, y, width, iconSize, hasIcon, svgContainer, true, Css.item.textBar)
//   }
// }
//
// /**
//  * Draws horizontal bar with differing height. SVG rect anchor is top left corner. SVG text anchor is left-middle.
//  * @param d event to draw
//  * @param x1 left bound of svg to draw
//  * @param x2 right bound of svg to draw
//  * @param y vertical center of svg to draw
//  * @param height height of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  */
// function drawEra(d: GanttItem, x1: number, x2: number, y: number, height: number, iconSize: number, svgContainer: SVGElement): void {
//   const iconRadius = iconSize / 2
//   const width = Math.max(2, x2 - x1)
//
//   const era = createSvg('rect', Css.item.era, {x: x1, y: y, width, height, 'data-id': d.id})
//   if (d.color) era.setAttribute('fill', d.color)
//   svgContainer.appendChild(era)
//
//   if (width > iconSize) {
//     const hasIcon = addIconIfPresent(d, x1, y, iconSize, svgContainer)
//     const text = `${d.name}` // `Era: ${d.name} (${d.startDateDisplay} - ${d.endDateDisplay})`
//     if (width > 2 * iconSize) addTextIfFitting(text, x1, y + iconRadius, width, iconSize, hasIcon, svgContainer, true, Css.item.textEra)
//   }
// }
//
// /**
//  * Draw small shape for event with a single timestamp (box|circle|diamond). Appends event color to SVG background and adds lucide icon on top if.
//  * @param d event to draw
//  * @param shape 'circle' | 'polygon' | 'rect'
//  * @param cssClass
//  * @param attrs
//  * @param x center of svg
//  * @param y center of svg
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawSmallShape(d: GanttItem,
//                         shape: 'circle' | 'polygon' | 'rect',
//                         cssClass: string,
//                         attrs: Record<string, string | number>,
//                         x: number,
//                         y: number,
//                         iconSize: number,
//                         svgContainer: SVGElement,
//                         availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const el = createSvg(shape, cssClass, {...attrs, 'data-id': d.id})
//   if (d.color) el.setAttribute('fill', d.color)
//   svgContainer.appendChild(el)
//   addIconIfPresent(d, x - iconRadius, y - iconRadius, iconSize, svgContainer)
//
//   const textX = x + iconRadius
//   addTextIfFitting(d.name, textX, y, availableWidth, iconSize, false, svgContainer, false, Css.item.textTimestamp)
// }
//
// /**
//  * Draw box for timestamp event. SVG bar anchor is top left corner.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw
//  * @param cy vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawBox(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   drawSmallShape(d, 'rect', 'gt-item timestamp box', {
//     x: cx - iconRadius,
//     y: cy - iconRadius
//   }, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draw diamond for timestamp event. SVG polygon anchor is dead center.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw, keep as is for 'polygon'
//  * @param cy vertical center of svg to draw, keep as is for 'polygon'
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth distance from this event to the next one to the right, use for description
//  */
// function drawDiamond(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = `${cx},${cy - iconRadius} ${cx + iconRadius},${cy} ${cx},${cy + iconRadius} ${cx - iconRadius},${cy}`
//   drawSmallShape(d, 'polygon', 'gt-item timestamp diamond', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draw circle for timestamp event. SVG circle anchor is dead center.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw
//  * @param cy vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawPoint(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   drawSmallShape(d, 'circle', 'gt-item timestamp circle', {cx, cy,}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draw triangle for timestamp event. SVG circle anchor is dead center.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw
//  * @param cy vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawTriangle(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = calculatePolygonPoints(iconRadius, cx, cy, 3)
//   drawSmallShape(d, 'polygon', 'gt-item timestamp triangle', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draw pentagon for timestamp event. SVG circle anchor is dead center.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw
//  * @param cy vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawPentagon(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = calculatePolygonPoints(iconRadius, cx, cy, 5)
//   drawSmallShape(d, 'polygon', 'gt-item timestamp pentagon', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// function drawStar(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = calculatePolygonPoints(iconRadius, cx, cy, 10, 0.382)
//   drawSmallShape(d, 'polygon', 'gt-item timestamp pentagon', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draw hexagon for timestamp event. SVG circle anchor is dead center.
//  * @param d event to draw
//  * @param cx horizontal center of svg to draw
//  * @param cy vertical center of svg to draw
//  * @param iconSize width and height of svg to draw
//  * @param svgContainer
//  * @param availableWidth calculated width from this event to the next one to the right, used for event description
//  */
// function drawHexagon(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = calculatePolygonPoints(iconRadius, cx, cy, 6)
//   drawSmallShape(d, 'polygon', 'gt-item timestamp hexagon', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// function drawOctagon(d: GanttItem, cx: number, cy: number, iconSize: number, svgContainer: SVGElement, availableWidth: number): void {
//   const iconRadius = iconSize / 2
//   const points = calculatePolygonPoints(iconRadius, cx, cy, 8, 1, 1 / 8)
//   drawSmallShape(d, 'polygon', 'gt-item timestamp hexagon', {points}, cx, cy, iconSize, svgContainer, availableWidth)
// }
//
// /**
//  * Draws vertical line, ignoring icons.
//  * SVG lines have no anchor, they just define start and end point.
//  * @param d event to draw
//  * @param x1 horizontal center of svg to draw
//  * @param y1 upper vertical bound of svg to draw
//  * @param y2 lower vertical bound of svg to draw
//  * @param width width of svg to draw
//  * @param svgContainer
//  */
// function drawVerticalLine(d: GanttItem, x1: number, y1: number, y2: number, width: number, svgContainer: SVGElement): void {
//   const line = createSvg('line', Css.item.line, {
//     x1, x2: x1, y1, y2, 'stroke-width': width, 'data-id': d.id
//   })
//   if (d.color) line.setAttribute('stroke', d.color)
//   svgContainer.appendChild(line)
//
//   // const availableWidth = 200 // Or calculate based on container bounds/remaining width
//   // addTextIfFitting(d.name, x1, y2 - iconRadius, availableWidth, false, svgContainer, false)
// }
//
// const moonSvgs: Record<number, DocumentFragment> = {
//   0: ManualSvg.newMoon,
//   1: ManualSvg.crescentHalfMoon,
//   2: ManualSvg.fullMoon,
//   3: ManualSvg.waningHalfMoon
// }
//
// /**
//  * Renders a moon phase SVG icon at the specified center coordinates (cx, cy).
//  *
//  * @param cx Center X position (usually xPos of the tick)
//  * @param cy Center Y position (e.g. -12 to sit right above baseline Y=0)
//  * @param phase Phase index (0 to 4)
//  * @param color
//  * @param moonIndex
//  * @param moonCount
//  * @param svgContainer The SVG parent group element (e.g. ticksG or individualAxisG)
//  */
// export function drawMoonPhase(cx: number,
//                               cy: number,
//                               phase: number,
//                               moonIndex: number,
//                               moonCount: number,
//                               svgContainer: SVGElement,
//                               color?: string): void {
//   const innerContent = moonSvgs[phase]
//   if (!innerContent) return
//
//   const iconSize = Math.max(19 - moonCount, 12)
//   const halfSize = iconSize / 2
//   const x = cx - halfSize
//   const yOffset = moonCount > 1 ? 14 * (moonIndex / (moonCount - 1)) : 0
//   const y = cy - halfSize + yOffset
//
//   const g = createSvg('svg', 'moon-phase-icon', {
//     width: iconSize, height: iconSize, viewBox: `0 0 24 24`, x, y
//   })
//
//   if (color) g.style.color = color
//
//   g.appendChild(innerContent.cloneNode(true)) // do not use g.innerHTML = innerContent
//   svgContainer.appendChild(g)
// }
//
// /**
//  * Calculate the points for a regular polygon inscribed in a circle.
//  * Returns a string suitable for SVG polygon points attribute.
//  *
//  * @param radius - The radius of the circumscribed circle
//  * @param cx - X coordinate of the circle center
//  * @param cy - Y coordinate of the circle center
//  * @param numCorners - Number of corners/vertices of the polygon
//  * @param altRadiusFactor - alternative radius factor for more complex forms (e.g. stars)
//  * @param additionalRotation - alternative rotation for more complex forms (e.g. octagon)
//  * @returns String in format 'x1,y1 x2,y2 x3,y3 ...' suitable for SVG polygon points
//  *          The first point is always at (cx, cy + radius)
//  */
// function calculatePolygonPoints(radius: number,
//                                 cx: number,
//                                 cy: number,
//                                 numCorners: number,
//                                 altRadiusFactor = 1,
//                                 additionalRotation = 0): string {
//   const points: string[] = []
//
//   /*
//    * Start angle: 90 degrees (π/2 radians) to make first point at top (x, y+r)
//    * value chosen to make triangle and pentagon point up
//    */
//   const startAngle = -Math.PI / 2 + Math.PI * additionalRotation
//
//   for (let i = 0; i < numCorners; i++) {
//     /* Calculate angle for this vertex (going clockwise) */
//     const angle = startAngle - (2 * Math.PI * i / numCorners)
//
//     const iterRad = (i % 2 === 0) ? 1 : altRadiusFactor
//
//     /* Calculate x and y coordinates */
//     const x = cx + radius * Math.cos(angle) * iterRad
//     const y = cy + radius * Math.sin(angle) * iterRad
//
//     points.push(`${x},${y}`)
//   }
//
//   return points.join(' ')
// }
