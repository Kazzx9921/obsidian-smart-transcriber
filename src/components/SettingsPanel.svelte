<script lang="ts">
  import type OBWhisperingPlugin from '../../main';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';

  // Props
  export let plugin: OBWhisperingPlugin;
  export let settings: VoiceTranscriberSettings;
  export let onclose: () => void;

  // Local state for form inputs
  let formData = {
    openaiApiKey: settings.openaiApiKey,
    whisperModel: settings.whisperModel,
    segmentDuration: settings.segmentDuration,
    silenceThreshold: settings.silenceThreshold,
    language: settings.language,
    enableTranslation: settings.enableTranslation,
    autoScroll: settings.autoScroll,
    showTimestamps: settings.showTimestamps,
    maxSegments: settings.maxSegments
  };

  async function saveSettings() {
    // Update plugin settings
    Object.assign(plugin.settings, formData);
    
    // Save to disk
    await plugin.saveSettings();
    
    // Close panel
    onclose();
  }

  function resetToDefaults() {
    // Reset form to current settings
    formData = {
      openaiApiKey: settings.openaiApiKey,
      whisperModel: settings.whisperModel,
      segmentDuration: settings.segmentDuration,
      silenceThreshold: settings.silenceThreshold,
      language: settings.language,
      enableTranslation: settings.enableTranslation,
      autoScroll: settings.autoScroll,
      showTimestamps: settings.showTimestamps,
      maxSegments: settings.maxSegments
    };
  }

  const languageOptions = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'ar', label: 'العربية' }
  ];

  const modelOptions = [
    { value: 'whisper-1', label: 'Whisper v1 (Recommended)' }
  ];
</script>

<div class="settings-panel">
  <div class="settings-header">
    <h4>Settings</h4>
    <button class="close-btn" onclick={onclose}>✕</button>
  </div>

  <div class="settings-content">
    <!-- API Configuration -->
    <div class="settings-section">
      <h5>API Configuration</h5>
      
      <div class="form-group">
        <label for="api-key">OpenAI API Key</label>
        <input
          id="api-key"
          type="password"
          bind:value={formData.openaiApiKey}
          placeholder="sk-..."
        />
        <small class="form-hint">
          Your OpenAI API key for Whisper transcription
        </small>
      </div>

      <div class="form-group">
        <label for="model">Whisper Model</label>
        <select id="model" bind:value={formData.whisperModel}>
          {#each modelOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Recording Settings -->
    <div class="settings-section">
      <h5>Recording Settings</h5>
      
      <div class="form-group">
        <label for="segment-duration">Segment Duration (seconds)</label>
        <input
          id="segment-duration"
          type="number"
          min="3"
          max="30"
          bind:value={formData.segmentDuration}
        />
        <small class="form-hint">
          How often to send audio segments for transcription (3-30 seconds)
        </small>
      </div>

      <div class="form-group">
        <label for="silence-threshold">Silence Threshold</label>
        <input
          id="silence-threshold"
          type="number"
          min="0"
          max="1"
          step="0.01"
          bind:value={formData.silenceThreshold}
        />
        <small class="form-hint">
          Volume level below which audio is considered silence (0.0-1.0)
        </small>
      </div>
    </div>

    <!-- Language Settings -->
    <div class="settings-section">
      <h5>Language Settings</h5>
      
      <div class="form-group">
        <label for="language">Language</label>
        <select id="language" bind:value={formData.language}>
          {#each languageOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={formData.enableTranslation}
          />
          Enable translation to English
        </label>
        <small class="form-hint">
          Translate non-English audio to English
        </small>
      </div>
    </div>

    <!-- Display Settings -->
    <div class="settings-section">
      <h5>Display Settings</h5>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={formData.autoScroll}
          />
          Auto-scroll to latest transcript
        </label>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={formData.showTimestamps}
          />
          Show timestamps
        </label>
      </div>

      <div class="form-group">
        <label for="max-segments">Max segments to keep</label>
        <input
          id="max-segments"
          type="number"
          min="10"
          max="1000"
          bind:value={formData.maxSegments}
        />
        <small class="form-hint">
          Maximum number of transcript segments to keep in memory
        </small>
      </div>
    </div>
  </div>

  <div class="settings-footer">
    <button class="btn secondary" onclick={resetToDefaults}>
      Reset
    </button>
    <button class="btn primary" onclick={saveSettings}>
      Save Settings
    </button>
  </div>
</div>

<style>
  .settings-panel {
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background-color: var(--background-primary);
    margin-bottom: 12px;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary);
    border-radius: 8px 8px 0 0;
  }

  .settings-header h4 {
    margin: 0;
    font-size: 1em;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 16px;
  }

  .close-btn:hover {
    background-color: var(--background-modifier-hover);
  }

  .settings-content {
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section h5 {
    margin: 0 0 12px 0;
    font-size: 0.9em;
    font-weight: 600;
    color: var(--text-accent);
    border-bottom: 1px solid var(--background-modifier-border);
    padding-bottom: 4px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 0.85em;
    font-weight: 500;
    color: var(--text-normal);
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background-color: var(--background-primary);
    color: var(--text-normal);
    font-size: 0.85em;
  }

  .form-group input[type="checkbox"] {
    width: auto;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-hint {
    display: block;
    margin-top: 4px;
    font-size: 0.75em;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .settings-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary);
    border-radius: 0 0 8px 8px;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .btn.primary {
    background-color: var(--interactive-accent);
    color: white;
  }

  .btn.primary:hover {
    background-color: var(--interactive-accent-hover);
  }

  .btn.secondary {
    background-color: var(--background-modifier-border);
    color: var(--text-normal);
  }

  .btn.secondary:hover {
    background-color: var(--background-modifier-hover);
  }
</style>
