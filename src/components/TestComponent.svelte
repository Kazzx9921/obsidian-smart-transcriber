<script lang="ts">
  import type OBWhisperingPlugin from '../../main';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';

  // Props
  export let plugin: OBWhisperingPlugin;
  export let settings: VoiceTranscriberSettings;

  // TestComponent loaded
</script>

<div class="test-component">
  <h3>Voice Transcriber Test</h3>
  <p>Plugin loaded: {plugin ? 'Yes' : 'No'}</p>
  <p>Settings loaded: {settings ? 'Yes' : 'No'}</p>
  <p>API Key configured: {settings?.openaiApiKey ? 'Yes' : 'No'}</p>
  
  <button on:click={() => {}}>
    Test Button
  </button>
</div>

<style>
  .test-component {
    padding: 20px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background-color: var(--background-primary);
  }

  h3 {
    margin: 0 0 16px 0;
    color: var(--text-normal);
  }

  p {
    margin: 8px 0;
    color: var(--text-muted);
  }

  button {
    padding: 8px 16px;
    background-color: var(--interactive-accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: var(--interactive-accent-hover);
  }
</style>
