import { ItemView, WorkspaceLeaf } from 'obsidian';
import VoiceTranscriberApp from '../components/VoiceTranscriberApp.svelte';
import type OBWhisperingPlugin from '../../main';

export const VIEW_TYPE_VOICE_TRANSCRIBER = 'voice-transcriber-view';

export class SidebarView extends ItemView {
	private component: any;
	private plugin: OBWhisperingPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: OBWhisperingPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_VOICE_TRANSCRIBER;
	}

	getDisplayText() {
		return 'Smart Transcriber';
	}

	getIcon() {
		return 'captions';
	}

	async onOpen() {
		try {
			// Clear any existing content
			this.contentEl.empty();
			
			// Ensure the contentEl itself has proper height
			this.contentEl.style.height = '100%';
			this.contentEl.style.display = 'flex';
			this.contentEl.style.flexDirection = 'column';
			
			// Add a container div for better styling
			const container = this.contentEl.createDiv('voice-transcriber-container');
			
			// Ensure the container fills the entire available height
			container.style.height = '100%';
			container.style.display = 'flex';
			container.style.flexDirection = 'column';
			
			// Mount the Svelte component using Svelte 4 API
			this.component = new VoiceTranscriberApp({
				target: container,
				props: {
					plugin: this.plugin,
					settings: this.plugin.settings
				}
			});
			
			console.log('Voice Transcriber view opened successfully');
		} catch (error) {
			console.error('Error opening Voice Transcriber view:', error);
			
			// Show error message to user
			this.contentEl.empty();
			const errorDiv = this.contentEl.createDiv('voice-transcriber-error');
			errorDiv.innerHTML = `
				<h3>Voice Transcriber Error</h3>
				<p>Failed to load the voice transcriber interface.</p>
				<p><strong>Error:</strong> ${error.message}</p>
				<p>Please check the developer console for more details.</p>
			`;
			errorDiv.style.padding = '20px';
			errorDiv.style.color = 'var(--text-error)';
		}
	}

	async onClose() {
		// Destroy the Svelte component
		if (this.component) {
			this.component.$destroy();
		}
	}
}
