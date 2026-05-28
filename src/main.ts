import {Notice, Plugin} from "obsidian"
import {MarkdownProcessor} from "./markdown-processor";

interface Settings {

}

export default class NotAnotherTimelinePlugin extends Plugin {
	sync: any
	settings!: Settings;

	async onload() {
		new Notice("'That other timeline' plugin loaded.", 500)


		this.registerMarkdownCodeBlockProcessor('notAnotherTimeline',
			(source, el, ctx) => {
				ctx.addChild(new MarkdownProcessor(source, this, el, ctx))
			}
		)


		// async loadSettings() {
		// }
		//
		// async saveSettings() {
		// // await this.saveData(this.settings);
		// }
	}



}

// class SettingTab extends PluginSettingTab {
// 	plugin: NotAnotherTimelinePlugin
//
// 	constructor(app: App, plugin: NotAnotherTimelinePlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}
//
// 	display() {
// 	}
// }


