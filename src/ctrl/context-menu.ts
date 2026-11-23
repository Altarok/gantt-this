import {Menu} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Popup} from '../util/popup'
import {SettingsContext} from '../model/settings-context'
import {GanttChartView} from "../view/gantt-chart-view";

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
      // this.addCopySmilesNotationMenuItem(menu)
      // this.addCopyCompleteCodeBlockMenuItem(menu)
      // this.addEditCodeBlockMenuItem(menu)
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
          const svgData = new XMLSerializer().serializeToString(this.view.eventSvg)

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

  // private addCopySmilesNotationMenuItem(menu: Menu) {
  //   menu.addItem((item) =>
  //     item
  //     .setTitle('Copy SMILES notation (text)')
  //     .setIcon('copy')
  //     .onClick(async () => await copyTextToClipboard(this.smilesString))
  //   )
  // }
  //
  // private addCopyCompleteCodeBlockMenuItem(menu: Menu) {
  //   menu.addItem((item) =>
  //     item
  //     .setTitle('Copy entire code block (text)')
  //     .setIcon('copy')
  //     .onClick(async () => await copyTextToClipboard(`\`\`\`${this.setting}\n${this.source}\n\`\`\``))
  //   )
  // }
  //
  // private addEditCodeBlockMenuItem(menu: Menu) {
  //   /* Context menu option 1: Jump to Code Block & Pre-input parameter */
  //   menu.addItem((item) => item
  //     .setTitle('Edit layout height')
  //     .setIcon('pencil')
  //     .onClick(async () => {
  //       const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
  //       if (!activeView) return
  //
  //       const editor = activeView.editor
  //       const totalLines = editor.lineCount()
  //
  //       for (let i = 0; i < totalLines; i++) {
  //         const lineText = editor.getLine(i)
  //
  //         /* Look for matching SMILES notation */
  //         if (lineText.trim() === this.smilesString) {
  //           const targetLine = i + 1
  //
  //           editor.setCursor({line: targetLine, ch: 0})
  //           editor.focus()
  //
  //           /* Insert a new config line directly below */
  //           editor.replaceRange('height: \n', {line: targetLine, ch: 0})
  //           editor.setCursor({line: targetLine, ch: 8})
  //           break
  //         }
  //       }
  //     })
  //   )
  // }
}

// async function copyTextToClipboard(text: string) {
//   try {
//     await window.navigator.clipboard.writeText(text)
//     Popup.ok(`Copied to clipboard:\n '${text}'`)
//   } catch (err) {
//     Popup.nok('Clipboard write failed', err)
//   }
// }

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

