import { App, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import type OBWhisperingPlugin from '../../main';
import type { VoiceTranscriberSettings } from './PluginSettings';

export class VoiceTranscriberSettingTab extends PluginSettingTab {
	plugin: OBWhisperingPlugin;

	constructor(app: App, plugin: OBWhisperingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Support section
		new Setting(containerEl)
			.setName('Support Smart Transcriber')
			.setDesc('Grateful for Smart Transcriber? Your support helps us continue building and improving it!')
			.addButton(button => button
				.setButtonText('Buy Me a Coffee')
				.setCta()
				.onClick(() => {
					window.open('https://buymeacoffee.com/kazen', '_blank');
				}));

		// API 設定區塊
		containerEl.createEl('h3', { text: 'API Configuration' });

		// OpenAI API Key
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for Whisper transcription. Get one from https://platform.openai.com/api-keys')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value.trim();
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Verify')
				.setTooltip('Test your OpenAI API key')
				.onClick(async () => {
					if (!this.plugin.settings.openaiApiKey) {
						button.setButtonText('No API Key');
						setTimeout(() => button.setButtonText('Verify'), 2000);
						return;
					}

					button.setButtonText('Verifying...');
					button.setDisabled(true);

					try {
						// Simple API test - create a small test request using requestUrl
						const response = await requestUrl({
							url: 'https://api.openai.com/v1/models',
							headers: {
								'Authorization': `Bearer ${this.plugin.settings.openaiApiKey}`,
							}
						});

						if (response.status === 200) {
							button.setButtonText('Success');
							setTimeout(() => {
								button.setButtonText('Verify');
								button.setDisabled(false);
							}, 2000);
						} else {
							button.setButtonText('Failed');
							setTimeout(() => {
								button.setButtonText('Verify');
								button.setDisabled(false);
							}, 2000);
						}
					} catch (error) {
						button.setButtonText('Error');
						setTimeout(() => {
							button.setButtonText('Verify');
							button.setDisabled(false);
						}, 2000);
					}
				}));

		// Model
		new Setting(containerEl)
			.setName('Model')
			.setDesc('Whisper model to use for transcription')
			.addDropdown(dropdown => dropdown
				.addOption('whisper-1', 'Whisper v1')
				.setValue(this.plugin.settings.whisperModel)
				.onChange(async (value) => {
					this.plugin.settings.whisperModel = value;
					await this.plugin.saveSettings();
				}));

		// 錄音設定區塊
		containerEl.createEl('h3', { text: 'Recording Settings' });

		// 分段時間
		new Setting(containerEl)
			.setName('Segment Duration')
			.setDesc('How often to send audio segments for transcription (3-30 seconds)')
			.addSlider(slider => slider
				.setLimits(3, 30, 1)
				.setValue(this.plugin.settings.segmentDuration)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.segmentDuration = value;
					await this.plugin.saveSettings();
				}))
			.addText(text => text
				.setValue(String(this.plugin.settings.segmentDuration))
				.onChange(async (value) => {
					const numValue = parseInt(value);
					if (!isNaN(numValue) && numValue >= 3 && numValue <= 30) {
						this.plugin.settings.segmentDuration = numValue;
						await this.plugin.saveSettings();
					}
				}));


		// 停頓檢測閾值
		new Setting(containerEl)
			.setName('Pause Detection Threshold')
			.setDesc('How long to wait for voice pause before uploading segment (10ms - 2000ms)')
			.addSlider(slider => slider
				.setLimits(10, 2000, 10)
				.setValue(this.plugin.settings.pauseThreshold)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.pauseThreshold = value;
					await this.plugin.saveSettings();
				}))
			.addText(text => text
				.setValue(`${this.plugin.settings.pauseThreshold}ms`)
				.setDisabled(true)
				.then(textComponent => {
					// Update the text display when slider changes
					const slider = containerEl.querySelector('.setting-item:last-child input[type="range"]') as HTMLInputElement;
					if (slider) {
						slider.addEventListener('input', () => {
							textComponent.setValue(`${slider.value}ms`);
						});
					}
				}));



		// 語言設定區塊
		containerEl.createEl('h3', { text: 'Language Settings' });

		// 語言選擇
		new Setting(containerEl)
			.setName('Language')
			.setDesc('Language for transcription (auto-detect or specific language)')
			.addDropdown(dropdown => {
				dropdown
					.addOption('auto', 'Auto')
					.addOption('en', 'English')
					.addOption('zh', '中文')
					.addOption('ja', '日本語')
					.addOption('ko', '한국어')
					.addOption('es', 'Español')
					.addOption('fr', 'Français')
					.addOption('de', 'Deutsch')
					.addOption('it', 'Italiano')
					.addOption('pt', 'Português')
					.addOption('ru', 'Русский')
					.addOption('ar', 'العربية')
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
					});
			});

		// 翻譯開關
		new Setting(containerEl)
			.setName('Enable Translation')
			.setDesc('Translate non-English audio to English')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTranslation)
				.onChange(async (value) => {
					this.plugin.settings.enableTranslation = value;
					await this.plugin.saveSettings();
				}));

		// 顯示設定區塊
		containerEl.createEl('h3', { text: 'Display Settings' });

		// 自動滾動
		new Setting(containerEl)
			.setName('Auto-scroll')
			.setDesc('Automatically scroll to the latest transcript')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoScroll)
				.onChange(async (value) => {
					this.plugin.settings.autoScroll = value;
					await this.plugin.saveSettings();
				}));



	}
}
