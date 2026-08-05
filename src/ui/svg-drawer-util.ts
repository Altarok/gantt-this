import {svgUrl} from '../const/constants'

export const Util = {
  createSVGElement
}

function createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K, cssClass?: string): SVGElementTagNameMap[K] {
  const element = window.document.createElementNS(svgUrl, tag)
  if (cssClass) element.setAttribute('class', cssClass)
  return element
}

