import {addIcon, sanitizeHTMLToDom} from 'obsidian'
import {svgUrl} from '../const/constants'

const xmlns = `xmlns="${svgUrl}"`
const svgBase = `<svg ${xmlns} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`


const resetZoom = `${svgBase}<path d="M3 11a8 8 0 1 0 8-8 8.75 8.75 0 0 0-5.74 1.74L3 7v-5v5h5"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`

const scatterChart = `${svgBase}<path d="M3 3v16a2 2 0 0 0 2 2h16" />
  <circle cx="11.5" cy="17.5" r="0.5" fill="currentColor" />
  <circle cx="13" cy="6.5" r="0.5" fill="currentColor" />
  <circle cx="18.5" cy="13" r="0.5" fill="currentColor" />
  <circle cx="6" cy="11" r="0.5" fill="currentColor" />
  <circle cx="9" cy="4" r="0.5" fill="currentColor" />
</svg>
`
const scatterChartCrossed =`${svgBase}<path d="M3 3v16a2 2 0 002 2h16" />
  <circle cx="11.5" cy="17.5" r="0.5" fill="currentColor" />
  <circle cx="13" cy="6.5" r="0.5" fill="currentColor" />
  <circle cx="18.5" cy="13" r="0.5" fill="currentColor" />
  <circle cx="6" cy="11" r="0.5" fill="currentColor" />
  <circle cx="9" cy="4" r="0.5" fill="currentColor" />
  <path d="M1 1 24 24" />
</svg>
`
const barChartCrossed =`${svgBase}
  <path d="M3 3v16a2 2 0 002 2h16" />
  <rect x="7" y="13" width="9" height="4" rx="1" />
  <rect x="7" y="5" width="12" height="4" rx="1" />
  <path d="M1 1 24 24" />
</svg>
`
const groupCrossed = `${svgBase}
<!--<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor"-->
<!--    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-group">-->
    <path d="M3 7V5c0-1.1.9-2 2-2h2" />
    <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
    <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
    <path d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
    <rect width="7" height="5" x="7" y="7" rx="1" />
    <rect width="7" height="5" x="10" y="12" rx="1" />
  <path d="M1 1 24 24" />
</svg>
`

const moonPhase0 = `<svg ${xmlns}><circle cx="12" cy="12" r="9" class="moon-unlit"/></svg>`
const moonPhase1 = `<svg ${xmlns}><path d="M 12 3 A 9 9 0 0 0 12 21 L 12 3 Z" class="moon-unlit"/><path d="M 12 3 A 9 9 0 0 1 12 21 L 12 3 Z" class="moon-fill"/><circle cx="12" cy="12" r="9"/></svg>`
const moonPhase2 = `<svg ${xmlns}><circle cx="12" cy="12" r="9" class="moon-fill"/></svg>`
const moonPhase3 = `<svg ${xmlns}><path d="M 12 3 A 9 9 0 0 1 12 21 L 12 3 Z" class="moon-unlit"/><path d="M 12 3 A 9 9 0 0 0 12 21 L 12 3 Z" class="moon-fill"/><circle cx="12" cy="12" r="9"/></svg>`

function addArrowTipAsSvgDef(svgEl: SVGElement): void {
  let defs = svgEl.querySelector('defs')
  if (!defs) {
    defs = window.document.createElementNS(svgUrl, 'defs')
    svgEl.insertBefore(defs, svgEl.firstChild)
  }

  if (!defs.querySelector('#gt-arrow-head')) {
    const marker = window.document.createElementNS(svgUrl, 'marker')
    marker.setAttribute('id', 'gt-arrow-head')
    marker.setAttribute('viewBox', '0 0 10 10')
    marker.setAttribute('refX', '5')
    marker.setAttribute('refY', '5')
    marker.setAttribute('markerWidth', '6')
    marker.setAttribute('markerHeight', '6')
    marker.setAttribute('orient', 'auto-start-reverse')

    const path = window.document.createElementNS(svgUrl, 'path')
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')


    const isDarkTheme = window.document.body.classList.contains("theme-dark")
    if (isDarkTheme)
      path.setAttribute('fill', 'white')
    else
      path.setAttribute('fill', 'black')

    marker.appendChild(path)
    defs.appendChild(marker)
  }
}

function addManualSvgsToObsidianCache() {
  addIcon("customBarChartCrossed", barChartCrossed)
  addIcon("customScatterChart", scatterChart)
  addIcon("customScatterChartCrossed", scatterChartCrossed)
  addIcon("customGroupCrossed", groupCrossed)
}

export const ManualSvg = {
  addManualSvgsToObsidianCache,
  resetZoom,
  newMoon: sanitizeHTMLToDom(moonPhase0), // 0/4 - New Moon (Outline circle)
  crescentHalfMoon: sanitizeHTMLToDom(moonPhase1), // 1/4 - First Quarter / Waxing (Right half filled)
  fullMoon: sanitizeHTMLToDom(moonPhase2), // 2/4 - Full Moon (Solid filled circle)
  waningHalfMoon: sanitizeHTMLToDom(moonPhase3), // 3/4 - Third Quarter / Waning (Left half filled)
  addArrowTipAsSvgDef,
  // addMoonIconsToObsidianCache
}
