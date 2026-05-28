import {MarkdownPostProcessorContext, MarkdownRenderChild, TFile, TFolder} from "obsidian"
import NotAnotherTimelinePlugin from "./main"

export class MarkdownProcessor extends MarkdownRenderChild {

	constructor(readonly source: string, readonly plugin: NotAnotherTimelinePlugin, readonly element: HTMLElement, readonly ctx: MarkdownPostProcessorContext) {
		super(element)

		this.display()
	}

	display(): void {

		let sourcePath: string = this.ctx.sourcePath

		debugger

		sourcePath = sourcePath.replace(/(.+)\/.*/,'$1')

		let folderByPath: TFolder | null = this.plugin.app.vault.getFolderByPath(sourcePath)
		if (folderByPath === null) return

		let filesInPath: TFile[] = []

		for (let file of this.plugin.app.vault.getFiles()) {

			if (file.path.contains(folderByPath.path)) filesInPath.push(file)

		}

		console.log('filesInPath: ' + filesInPath)

	}


	private enter() {
		return undefined;
	}

	private displayInvitation() {

	}
}
