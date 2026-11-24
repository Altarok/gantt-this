import {Menu} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Popup} from '../util/popup'
import {SettingsContext} from '../model/settings-context'
import {GanttChartView} from '../view/gantt-chart-view'

export class ContextMenuBuilder {
  constructor(readonly plugin: FantasyGanttPlugin,
              readonly view: GanttChartView,
              readonly settings: SettingsContext) {
  }

  build() {
    this.view.chartContainer.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault() // prevents standard browser context menu TODO instead extend?

      const menu = new Menu()
      this.addCopySvgAsPngMenuItem(menu)
      menu.showAtPosition({x: event.clientX, y: event.clientY})
    })
  }

  private addCopySvgAsPngMenuItem(menu: Menu) {
    /* Context menu option 2: Copy SVG as PNG (as of version 0.3.0 ) */
    menu.addItem((item) =>
      item
      .setTitle('Copy as image (PNG)')
      .setIcon('copy')
      .onClick(() => {
        try {
          /* Get the raw XML string from your actual generated SVG element */
          const svgData = combineSvgsToData(this.view.calendarSvg, this.view.eventSvg)

          /* Create a hidden canvas element wrapper to convert vector to pixel raster data */
          const canvas: HTMLCanvasElement = window.createEl('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          /* Standard boundaries based on your active dimensions */
          const dimensions0 = this.view.eventSvg.getBoundingClientRect()
          const dimensions1 = this.view.calendarSvg.getBoundingClientRect()
          canvas.width = dimensions0.width
          canvas.height = dimensions0.height + dimensions1.height

          /* Set up a modern blob image conversion pipeline */
          const img = new window.Image()
          const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'})
          const url = URL.createObjectURL(svgBlob)


          img.onload = () => {
            // try {
            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(url)

            /* Extract standard PNG image blob from canvas cache data without a leaking promise */
            canvas.toBlob((pngBlob) => {
              if (!pngBlob) {
                Popup.nok('Copy failed', new Error('Failed to export PNG blob'))
                return
              }
              void copyImageToClipboard(pngBlob)
            }, 'image/png')

            // } catch (err) {
            //   Popup.nok('Copy failed', err)
            // } finally {
            //   URL.revokeObjectURL(url)
            // }
          }

          img.src = url
        } catch (err) {
          Popup.nok('Copy failed', err)
        }
      })
    )
  }
}


async function copyImageToClipboard(pngBlob: Blob) {
  try {
    await window.navigator.clipboard.write([
      new ClipboardItem({'image/png': pngBlob})
    ])
    Popup.ok('Image copied to clipboard.')
  } catch (err) {
    Popup.nok('Clipboard write failed', err)
  }
}

function combineSvgsToData(axisSvg: SVGSVGElement, itemsSvg: SVGSVGElement): string {
  const svgNs = 'http://www.w3.org/2000/svg'
  const axisRect = axisSvg.getBoundingClientRect()
  const itemsRect = itemsSvg.getBoundingClientRect()


  const totalWidth = Math.max(axisRect.right, itemsRect.right)
  const totalHeight = axisRect.bottom + itemsRect.bottom

  const combined = window.document.createElementNS(svgNs, 'svg')
  combined.setAttribute('xmlns', svgNs)
  combined.setAttribute('width', String(totalWidth))
  combined.setAttribute('height', String(totalHeight))
  combined.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
  combined.style.overflow = 'hidden'

  const defs = window.document.createElementNS(svgNs, 'defs')
  const clipPath = window.document.createElementNS(svgNs, 'clipPath')
  clipPath.setAttribute('id', 'export-clip')


  /* Add css */
  const exportCss = createCss(itemsSvg /* , axisSvg */)
  const styleEl = window.document.createElementNS(svgNs, 'style')
  styleEl.textContent = exportCss
  defs.appendChild(styleEl)

  const clipRect = window.document.createElementNS(svgNs, 'rect')
  clipRect.setAttribute('x', '0')
  clipRect.setAttribute('y', '0')
  clipRect.setAttribute('width', String(totalWidth))
  clipRect.setAttribute('height', String(totalHeight))
  clipPath.appendChild(clipRect)
  defs.appendChild(clipPath)
  combined.appendChild(defs)

  const clippedRoot = window.document.createElementNS(svgNs, 'g')
  clippedRoot.setAttribute('clip-path', 'url(#export-clip)')
  combined.appendChild(clippedRoot)

  const bgRect = window.document.createElementNS(svgNs, 'rect')
  bgRect.setAttribute('class', 'gt-export-bg')
  bgRect.setAttribute('x', '0')
  bgRect.setAttribute('y', '0')
  bgRect.setAttribute('width', String(totalWidth))
  bgRect.setAttribute('height', String(totalHeight))
  clippedRoot.appendChild(bgRect)

  const appendPart = (source: SVGSVGElement, dx: number, dy: number) => {
    const clone = source.cloneNode(true) as SVGSVGElement

    const group = window.document.createElementNS(svgNs, 'g')
    group.setAttribute('transform', `translate(${dx}, ${dy})`)

    while (clone.firstChild) {
      group.appendChild(clone.firstChild)
    }
    clippedRoot.appendChild(group)
  }

  appendPart(itemsSvg, 0, 0)
  appendPart(axisSvg, 0, itemsRect.height)

  const svgData = new XMLSerializer().serializeToString(combined)
  return svgData
}

function readCssVar(computed: CSSStyleDeclaration, name: string, fallback: string): string {
  return computed.getPropertyValue(name).trim() || fallback
}

function createCss(itemsSvg: SVGSVGElement /*, axisSvg: SVGSVGElement */) {
  const computed: CSSStyleDeclaration = window.getComputedStyle(itemsSvg.parentElement ?? itemsSvg)

  const bgPrimary = readCssVar(computed, '--background-primary', '#1e1e1e')
  const bgSecondary = readCssVar(computed, '--background-secondary', '#262626')
  const textNormal = readCssVar(computed, '--text-normal', '#dcddde')
  const textMuted = readCssVar(computed, '--text-muted', '#9da3aa')
  const textAccent = readCssVar(computed, '--text-accent', '#7f6df2')
  const borderColor = readCssVar(computed, '--background-modifier-border', '#3f3f3f')

  const fontFamily = computed.fontFamily || 'sans-serif'
  const isLightTheme = window.document.body.classList.contains('theme-light')

  return `
    svg { font-family: ${fontFamily}; color: ${textNormal}; }
    .gt-prevent-user-interactions { pointer-events: none; user-select: none; }
    .gt-export-bg { fill: ${bgPrimary}; }
    .gt-axis-gridline { stroke: ${borderColor}; stroke-width: 1; stroke-dasharray: 4 4; opacity: 0.4; }
    .gt-axis-label-badge { rx: 8px; ry: 8px; fill: ${textAccent}; opacity: 1; }
    .gt-axis-label { fill: ${borderColor}; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .gt-axis-text { text-anchor: middle; font-size: 11px; font-weight: 500; fill: ${textNormal}; }
    .gt-axis-tick-minor { stroke: ${textMuted}; stroke-width: 1; opacity: 0.7; }
    .gt-group-row-even { fill: ${bgSecondary}; opacity: 0.3; }
    .gt-group-row-odd { fill: ${bgSecondary}; opacity: 0.05; }
    .gt-group-text { fill: ${textAccent}; font-size: 10px; font-weight: 600; letter-spacing: 1px; }
    .gt-group-badge { rx: 9px; ry: 9px; fill: ${borderColor}; opacity: 0.6; }
    .gt-layers-eras { fill-opacity: 0.15; stroke-opacity: 1; }
    .gt-layers-repeaters { fill-opacity: 0.25; stroke-opacity: 0.5; }
    .gt-item.timespan.bar, .gt-item.timestamp.box { rx: 2px; ry: 2px; }
    .gt-item.timespan.bar { stroke: ${textMuted}; stroke-width: 1px; }
    .gt-item.text-timestamp, .gt-item.text-bar, .gt-item.text-era { font-size: 14px; dominant-baseline: middle; }
    .gt-item.text-bar { fill: ${isLightTheme ? '#000000' : '#ffffff'}; }
    .gt-item.text-era { fill: ${isLightTheme ? '#ffffff' : '#000000'}; }
    .gt-item.text-timestamp { fill: ${textNormal}; }
    .gt-moon-phases { opacity: 0.8; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; }
    .gt-calendar-reign-title { font-size: 11px; font-weight: 600; opacity: 0.85; }
  `
}


