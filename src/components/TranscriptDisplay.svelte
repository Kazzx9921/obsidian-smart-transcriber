<script lang="ts">
  import { afterUpdate } from 'svelte';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';

  interface TranscriptSegment {
    id: string;
    timestamp: Date;
    text: string;
    isProcessing: boolean;
  }

  // Props
  export let segments: TranscriptSegment[];
  export let settings: VoiceTranscriberSettings;
  export let onclear: () => void;

  let scrollContainer: HTMLDivElement;

  // Auto-scroll to bottom when new segments are added
  afterUpdate(() => {
    if (settings.autoScroll && scrollContainer && segments.length > 0) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });

  function formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function copySegment(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // TODO: Show toast notification
      // Copied to clipboard
    });
  }

  function copyAllTranscripts() {
    const allText = segments
      .filter(s => !s.isProcessing)
      .map(s => s.text)
      .join(' ');
    
    navigator.clipboard.writeText(allText).then(() => {
      // All transcripts copied to clipboard
    });
  }

  function exportTranscripts() {
    const content = segments
      .filter(s => !s.isProcessing)
      .map(s => {
        const time = settings.showTimestamps ? `[${formatTimestamp(s.timestamp)}] ` : '';
        return `${time}${s.text}`;
      })
      .join('\n');

    // Create download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="transcript-display">
  <!-- Header with controls -->
  <div class="transcript-header">
    <h4>Transcripts ({segments.length})</h4>
    <div class="header-controls">
      <button 
        class="control-btn"
        onclick={copyAllTranscripts}
        title="Copy all transcripts"
        disabled={segments.length === 0}
      >
        📋
      </button>
      <button 
        class="control-btn"
        onclick={exportTranscripts}
        title="Export transcripts"
        disabled={segments.length === 0}
      >
        💾
      </button>
      <button 
        class="control-btn danger"
        onclick={onclear}
        title="Clear all transcripts"
        disabled={segments.length === 0}
      >
        🗑️
      </button>
    </div>
  </div>

  <!-- Transcript segments -->
  <div class="transcript-container" bind:this={scrollContainer}>
    {#if segments.length === 0}
      <div class="empty-state">
        <p>No transcripts yet</p>
        <p class="empty-hint">Start recording to see transcripts here</p>
      </div>
    {:else}
      {#each segments as segment (segment.id)}
        <div class="transcript-segment" class:processing={segment.isProcessing}>
          {#if settings.showTimestamps}
            <div class="segment-timestamp">
              {formatTimestamp(segment.timestamp)}
            </div>
          {/if}
          
          <div class="segment-content">
            {#if segment.isProcessing}
              <div class="processing-indicator">
                <div class="spinner"></div>
                <span>Processing...</span>
              </div>
            {:else}
              <div class="segment-text">
                {segment.text}
              </div>
              <button 
                class="copy-segment-btn"
                onclick={() => copySegment(segment.text)}
                title="Copy this segment"
              >
                📋
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .transcript-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background-color: var(--background-primary);
    min-height: 300px;
  }

  .transcript-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary);
    border-radius: 8px 8px 0 0;
  }

  .transcript-header h4 {
    margin: 0;
    font-size: 0.95em;
    font-weight: 600;
    color: var(--text-normal);
  }

  .header-controls {
    display: flex;
    gap: 4px;
  }

  .control-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .control-btn:hover:not(:disabled) {
    background-color: var(--background-modifier-hover);
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-btn.danger:hover:not(:disabled) {
    background-color: var(--background-modifier-error);
  }

  .transcript-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-hint {
    font-size: 0.85em;
    opacity: 0.7;
  }

  .transcript-segment {
    margin-bottom: 12px;
    padding: 8px;
    border-radius: 6px;
    background-color: var(--background-secondary);
    border-left: 3px solid var(--color-accent);
  }

  .transcript-segment.processing {
    border-left-color: var(--text-warning);
    opacity: 0.7;
  }

  .segment-timestamp {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-bottom: 4px;
    font-family: monospace;
  }

  .segment-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .processing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-style: italic;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--background-modifier-border);
    border-top: 2px solid var(--text-warning);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .segment-text {
    flex: 1;
    line-height: 1.4;
    color: var(--text-normal);
  }

  .copy-segment-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 12px;
    opacity: 0.6;
    transition: all 0.2s ease;
  }

  .copy-segment-btn:hover {
    opacity: 1;
    background-color: var(--background-modifier-hover);
  }
</style>
