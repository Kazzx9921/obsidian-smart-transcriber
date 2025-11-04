import { ItemView, WorkspaceLeaf } from 'obsidian';
import VoiceTranscriberApp from '../components/VoiceTranscriberApp.svelte';
import type OBWhisperingPlugin from '../../main';

export const VIEW_TYPE_VOICE_TRANSCRIBER = 'voice-transcriber-view';

export class SidebarView extends ItemView {
	private component: VoiceTranscriberApp | null = null;
	private plugin: OBWhisperingPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: OBWhisperingPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_VOICE_TRANSCRIBER;
	}

	getDisplayText() {
		return 'Smart transcriber';
	}

	getIcon() {
		return 'captions';
	}

	async onOpen() {
		try {
			// Clear any existing content
			this.contentEl.empty();
			
			// Add CSS class instead of inline styles
			this.contentEl.addClass('voice-transcriber-content');
			
			// Add a container div for better styling
			const container = this.contentEl.createDiv('voice-transcriber-container');
			
			// Mount the Svelte component using Svelte 4 API
			this.component = new VoiceTranscriberApp({
				target: container,
				props: {
					plugin: this.plugin,
					settings: this.plugin.settings
				}
			});
		} catch (error) {
			console.error('Error opening Voice Transcriber view:', error);
			
			// Show error message to user using DOM API instead of innerHTML
			this.contentEl.empty();
			const errorDiv = this.contentEl.createDiv('voice-transcriber-error');
			
			// Create error elements using safe DOM API
			errorDiv.createEl('h3', { text: 'Voice transcriber error' });
			errorDiv.createEl('p', { text: 'Failed to load the voice transcriber interface.' });
			
			const errorDetailP = errorDiv.createEl('p');
			errorDetailP.createEl('strong', { text: 'Error: ' });
			errorDetailP.appendText(error.message);
			
			errorDiv.createEl('p', { text: 'Please check the developer console for more details.' });
		}
	}

	async onClose() {
		// Destroy the Svelte component
		if (this.component) {
			this.component.$destroy();
		}
	}
}
