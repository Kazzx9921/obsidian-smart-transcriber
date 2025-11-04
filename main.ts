import { Plugin } from 'obsidian';
import { SidebarView, VIEW_TYPE_VOICE_TRANSCRIBER } from './src/views/SidebarView';
import type { VoiceTranscriberSettings } from './src/settings/PluginSettings';
import { DEFAULT_SETTINGS } from './src/settings/PluginSettings';
import { VoiceTranscriberSettingTab } from './src/settings/SettingTab';

export default class OBWhisperingPlugin extends Plugin {
	settings: VoiceTranscriberSettings;

	async onload() {
		try {
			// Load settings
			await this.loadSettings();

			// Register the sidebar view
			this.registerView(
				VIEW_TYPE_VOICE_TRANSCRIBER,
				(leaf) => new SidebarView(leaf, this)
			);

		// Add ribbon icon to activate view
		this.addRibbonIcon('captions', 'Open voice transcriber', () => {
				void this.activateView();
			});

		// Add command to open view
		this.addCommand({
			id: 'open-transcriber',
			name: 'Open voice transcriber',
				callback: () => {
					void this.activateView();
				}
			});

			// Add settings tab
			this.addSettingTab(new VoiceTranscriberSettingTab(this.app, this));
		} catch (error) {
			console.error('Error loading OB Whispering Plugin:', error);
		}
	}

	onunload() {
		// Plugin cleanup
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		try {
			const { workspace } = this.app;

			let leaf = workspace.getLeavesOfType(VIEW_TYPE_VOICE_TRANSCRIBER)[0];

			if (!leaf) {
				// Create new leaf in right sidebar
				leaf = workspace.getRightLeaf(false);
				
				await leaf.setViewState({
					type: VIEW_TYPE_VOICE_TRANSCRIBER,
					active: true,
				});
			}

			// Reveal and focus the leaf
			void workspace.revealLeaf(leaf);
		} catch (error) {
			console.error('Error activating view:', error);
		}
	}
}
