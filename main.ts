import { Plugin } from 'obsidian';
import { SidebarView, VIEW_TYPE_VOICE_TRANSCRIBER } from './src/views/SidebarView';
import type { VoiceTranscriberSettings } from './src/settings/PluginSettings';
import { DEFAULT_SETTINGS } from './src/settings/PluginSettings';
import { VoiceTranscriberSettingTab } from './src/settings/SettingTab';

export default class OBWhisperingPlugin extends Plugin {
	settings: VoiceTranscriberSettings;

	async onload() {
		console.log('Loading OB Whispering Plugin');

		try {
			// Load settings
			await this.loadSettings();
			console.log('Settings loaded:', this.settings);

			// Register the sidebar view
			this.registerView(
				VIEW_TYPE_VOICE_TRANSCRIBER,
				(leaf) => {
					console.log('Creating new SidebarView');
					return new SidebarView(leaf, this);
				}
			);
			console.log('View registered');

		// Add ribbon icon to activate view
		this.addRibbonIcon('captions', 'Open Smart Transcriber', () => {
				console.log('Ribbon icon clicked');
				this.activateView();
			});
			console.log('Ribbon icon added');

		// Add command to open view
		this.addCommand({
			id: 'open-smart-transcriber',
			name: 'Open Smart Transcriber',
				callback: () => {
					console.log('Command executed');
					this.activateView();
				}
			});
			console.log('Command added');

			// Add settings tab
			this.addSettingTab(new VoiceTranscriberSettingTab(this.app, this));
			console.log('Settings tab added');

			console.log('OB Whispering Plugin loaded successfully');
		} catch (error) {
			console.error('Error loading OB Whispering Plugin:', error);
		}
	}

	onunload() {
		console.log('Unloading OB Whispering Plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		try {
			console.log('Activating view...');
			const { workspace } = this.app;

			let leaf = workspace.getLeavesOfType(VIEW_TYPE_VOICE_TRANSCRIBER)[0];
			console.log('Existing leaf found:', !!leaf);

			if (!leaf) {
				// Create new leaf in right sidebar
				console.log('Creating new leaf in right sidebar');
				leaf = workspace.getRightLeaf(false);
				console.log('Right leaf obtained:', !!leaf);
				
				await leaf.setViewState({
					type: VIEW_TYPE_VOICE_TRANSCRIBER,
					active: true,
				});
				console.log('View state set');
			}

			// Reveal and focus the leaf
			workspace.revealLeaf(leaf);
			console.log('Leaf revealed');
		} catch (error) {
			console.error('Error activating view:', error);
		}
	}
}
