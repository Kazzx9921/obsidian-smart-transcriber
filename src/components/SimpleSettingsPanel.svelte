<script lang="ts">
  import type OBWhisperingPlugin from '../../main';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';

  // Props
  export let plugin: OBWhisperingPlugin;
  export let settings: VoiceTranscriberSettings;
  export let onclose: () => void;

  // Local state for form inputs
  let apiKey = settings.openaiApiKey;
  let segmentDuration = settings.segmentDuration;
  let language = settings.language;

  async function saveSettings() {
    // Update plugin settings
    plugin.settings.openaiApiKey = apiKey;
    plugin.settings.segmentDuration = segmentDuration;
    plugin.settings.language = language;
    
    // Save to disk
    await plugin.saveSettings();
    
    // Settings saved
    
    // Close panel
    onclose();
  }

  function resetSettings() {
    apiKey = settings.openaiApiKey;
    segmentDuration = settings.segmentDuration;
    language = settings.language;
  }
</script>

<div class="simple-settings-panel">
  <div class="settings-header">
    <h4>Settings</h4>
    <button class="close-btn" on:click={onclose}>✕</button>
  </div>

  <div class="settings-content">
    <div class="form-group">
      <label for="api-key">OpenAI API Key</label>
      <input
        id="api-key"
        type="password"
        bind:value={apiKey}
        placeholder="sk-..."
      />
      <small>Your OpenAI API key for Whisper transcription</small>
    </div>

    <div class="form-group">
      <label for="segment-duration">Segment Duration (seconds)</label>
      <input
        id="segment-duration"
        type="number"
        min="3"
        max="30"
        bind:value={segmentDuration}
      />
      <small>How often to send audio for transcription (3-30 seconds)</small>
    </div>

    <div class="form-group">
      <label for="language">Language</label>
      <select id="language" bind:value={language}>
        <option value="auto">Auto-detect</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  </div>

  <div class="settings-footer">
    <button class="btn secondary" on:click={resetSettings}>
      Reset
    </button>
    <button class="btn primary" on:click={saveSettings}>
      Save
    </button>
  </div>
</div>

<style>
  .simple-settings-panel {
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
    color: var(--text-normal);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 16px;
    color: var(--text-normal);
  }

  .close-btn:hover {
    background-color: var(--background-modifier-hover);
  }

  .settings-content {
    padding: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 0.9em;
    font-weight: 500;
    color: var(--text-normal);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background-color: var(--background-primary);
    color: var(--text-normal);
    font-size: 0.9em;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-group small {
    display: block;
    margin-top: 4px;
    font-size: 0.8em;
    color: var(--text-muted);
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
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
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
