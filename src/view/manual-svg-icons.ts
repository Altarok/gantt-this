import {sanitizeHTMLToDom} from 'obsidian'
//  <span class="m_8d3afb97 mantine-ActionIcon-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-zoom-reset "><path d="M21 21l-6 -6"></path><path d="M3.268 12.043a7.017 7.017 0 0 0 6.634 4.957a7.012 7.012 0 0 0 7.043 -6.131a7 7 0 0 0 -5.314 -7.672a7.021 7.021 0 0 0 -8.241 4.403"></path><path d="M3 4v4h4"></path></svg></span>

const resetZoom = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M3 11a8 8 0 1 0 8-8 8.75 8.75 0 0 0-5.74 1.74L3 7v-5v5h5"/>
<line x1="21" x2="16.65" y1="21" y2="16.65"/>
</svg>
`
const moonPhase0 = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" class="moon-unlit"/></svg>`
const moonPhase1 = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M 12 3 A 9 9 0 0 0 12 21 L 12 3 Z" class="moon-unlit"/><path d="M 12 3 A 9 9 0 0 1 12 21 L 12 3 Z" class="moon-fill"/><circle cx="12" cy="12" r="9"/></svg>`
const moonPhase2 = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" class="moon-fill"/></svg>`
const moonPhase3 = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M 12 3 A 9 9 0 0 1 12 21 L 12 3 Z" class="moon-unlit"/><path d="M 12 3 A 9 9 0 0 0 12 21 L 12 3 Z" class="moon-fill"/><circle cx="12" cy="12" r="9"/></svg>`


function saveAllToApi() {
  // addIcon('gt-arrow-head', `<marker id="gt-arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  //   <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--interactive-accent)" />
  // </marker>`);
}

export const ManualSvg = {
  resetZoom,
  newMoon: sanitizeHTMLToDom(moonPhase0), // 0/4 - New Moon (Outline circle)
  crescentHalfMoon: sanitizeHTMLToDom(moonPhase1), // 1/4 - First Quarter / Waxing (Right half filled)
  fullMoon: sanitizeHTMLToDom(moonPhase2), // 2/4 - Full Moon (Solid filled circle)
  waningHalfMoon: sanitizeHTMLToDom(moonPhase3), // 3/4 - Third Quarter / Waning (Left half filled)

  saveAllToApi
}

//~~~meta-bind-js-view
//{memory^angle} as degrees
//---
//const dia = 200
//const rad = dia / 2
//const angle = ((d) => -d)(context.bound.degrees ?? 0) * Math.PI / 180
//const sin = Math.sin(angle)
//const cos = Math.cos(angle)
//const signSin = Math.sign(sin)
//const signCos = Math.sign(cos)
//const flagSin = Math.max(0, signSin)
//const flagCos = Math.max(0, signCos)
//const svg = `<svg width='${dia}' height='${dia}' stroke-width='0' xlmns='http://www.w3.org/2000/svg'>
//    <circle cx='${rad}' cy='${rad}' r='${rad}' fill='#000' />
//    <path d='M ${rad} 0
//            a ${cos * rad} ${rad} 0 0 ${Math.abs(flagSin - flagCos)} 0 ${dia}
//            a ${rad} ${rad} 0 0 ${flagSin} 0 ${-1 * dia}
//            Z'
//        fill='#fff'
//    />
//</svg>`
//return engine.markdown.create(svg)
//~~~
//
//  `INPUT[progressBar(minValue(0), maxValue(360)):memory^angle]`
