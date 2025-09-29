<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';
  import { SegmentManager, type TranscriptSegment } from '../services/SegmentManager';

  // Props
  export let isRecording: boolean;
  export let settings: VoiceTranscriberSettings;
  export let onstart: () => void;
  export let onstop: () => void;
  export let onnewsegment: (segment: { id: string; timestamp: Date; text: string; isProcessing: boolean }) => void;
  export let onupdatesegment: (id: string, text: string) => void;

  // Recording state
  let audioLevel = 0;
  let recordingTime = 0;
  let recordingTimer: number | null = null;
  let segmentManager: SegmentManager | null = null;
  let initializationError: string | null = null;
  let isInitializing = false;

  // Initialize segment manager
  async function initializeRecorder() {
    if (!settings.openaiApiKey) {
      initializationError = 'OpenAI API key is required';
      return;
    }

    isInitializing = true;
    initializationError = null;

    try {
      segmentManager = new SegmentManager({
        apiKey: settings.openaiApiKey,
        segmentDuration: settings.segmentDuration,
        silenceThreshold: settings.silenceThreshold,
        whisperOptions: {
          model: settings.whisperModel,
          language: settings.language === 'auto' ? undefined : settings.language,
          response_format: 'json'
        },
        onSegmentUpdate: handleSegmentUpdate,
        onAudioLevel: handleAudioLevel,
        onError: handleError
      });

      await segmentManager.initialize();
      // Audio recorder initialized successfully
    } catch (error) {
      initializationError = `Failed to initialize: ${(error as Error).message}`;
      segmentManager = null;
    } finally {
      isInitializing = false;
    }
  }

  function handleSegmentUpdate(segment: TranscriptSegment) {
    if (segment.isProcessing) {
      onnewsegment({
        id: segment.id,
        timestamp: segment.timestamp,
        text: segment.text,
        isProcessing: true
      });
    } else {
      onupdatesegment(segment.id, segment.text);
    }
  }

  function handleAudioLevel(level: number) {
    audioLevel = level * 100; // Convert to percentage
  }

  function handleError(error: Error) {
    console.error('Recording error:', error);
    initializationError = error.message;
  }

  async function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    if (!segmentManager) {
      await initializeRecorder();
      if (!segmentManager) return;
    }

    try {
      await segmentManager.startRecording();
      onstart();
      recordingTime = 0;
      
      // Start timer
      recordingTimer = window.setInterval(() => {
        recordingTime++;
      }, 1000);

      // Recording started
    } catch (error) {
      handleError(error as Error);
    }
  }

  function stopRecording() {
    if (segmentManager) {
      segmentManager.stopRecording();
    }
    
    onstop();
    
    // Clear timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    audioLevel = 0;
    recordingTime = 0;

    // Recording stopped
  }

  // Update settings when they change
  $: if (segmentManager && settings) {
    segmentManager.updateSettings({
      apiKey: settings.openaiApiKey,
      segmentDuration: settings.segmentDuration,
      silenceThreshold: settings.silenceThreshold,
      whisperOptions: {
        model: settings.whisperModel,
        language: settings.language === 'auto' ? undefined : settings.language
      }
    });
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    if (segmentManager) {
      segmentManager.dispose();
    }
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="voice-recorder">
  <!-- Error Display -->
  {#if initializationError}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{initializationError}</span>
      {#if initializationError.includes('API key')}
        <button class="error-action" on:click={() => initializationError = null}>
          Configure API Key
        </button>
      {/if}
    </div>
  {/if}

  <!-- Recording Status -->
  <div class="recording-status">
    <div class="status-indicator" class:recording={isRecording} class:initializing={isInitializing}>
      {#if isInitializing}
        <div class="spinner"></div>
      {:else if isRecording}
        <div class="pulse"></div>
      {/if}
      <span class="status-text">
        {isInitializing ? 'Initializing...' : isRecording ? 'Recording' : 'Ready'}
      </span>
    </div>
    
    {#if isRecording}
      <div class="recording-time">
        {formatTime(recordingTime)}
      </div>
    {/if}
  </div>

  <!-- Audio Level Indicator -->
  {#if isRecording}
    <div class="audio-level">
      <div class="level-bar">
        <div 
          class="level-fill" 
          style="width: {audioLevel}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Main Record Button -->
  <div class="record-controls">
    <button 
      class="record-btn" 
      class:recording={isRecording}
      class:disabled={isInitializing || (initializationError && !settings.openaiApiKey)}
      on:click={toggleRecording}
      disabled={isInitializing || (initializationError && !settings.openaiApiKey)}
      title={isRecording ? 'Stop Recording' : 'Start Recording'}
    >
      {#if isRecording}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      {:else}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Recording Info -->
  <div class="recording-info">
    <div class="info-item">
      <span class="label">Segment Duration:</span>
      <span class="value">{settings.segmentDuration}s</span>
    </div>
    <div class="info-item">
      <span class="label">Language:</span>
      <span class="value">{settings.language}</span>
    </div>
  </div>
</div>

<style>
  .voice-recorder {
    padding: 16px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background-color: var(--background-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background-color: var(--background-modifier-error);
    border-radius: 6px;
    font-size: 0.85em;
  }

  .error-icon {
    font-size: 16px;
  }

  .error-text {
    flex: 1;
    color: var(--text-error);
  }

  .error-action {
    background: none;
    border: 1px solid var(--text-error);
    color: var(--text-error);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
  }

  .error-action:hover {
    background-color: var(--text-error);
    color: white;
  }

  .recording-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-indicator.initializing .status-text {
    color: var(--text-warning);
  }

  .pulse {
    width: 8px;
    height: 8px;
    background-color: var(--text-error);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(1); }
  }

  .status-text {
    font-weight: 500;
    color: var(--text-normal);
  }

  .recording.status-text {
    color: var(--text-error);
  }

  .recording-time {
    font-family: monospace;
    font-size: 0.9em;
    color: var(--text-muted);
  }

  .audio-level {
    margin-bottom: 16px;
  }

  .level-bar {
    width: 100%;
    height: 4px;
    background-color: var(--background-modifier-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .level-fill {
    height: 100%;
    background-color: var(--color-accent);
    transition: width 0.1s ease;
  }

  .record-controls {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .record-btn {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    background-color: var(--interactive-accent);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .record-btn:hover {
    background-color: var(--interactive-accent-hover);
    transform: scale(1.05);
  }

  .record-btn.recording {
    background-color: var(--text-error);
  }

  .record-btn.recording:hover {
    background-color: var(--text-error);
    opacity: 0.8;
  }

  .record-btn.disabled {
    background-color: var(--background-modifier-border);
    color: var(--text-muted);
    cursor: not-allowed;
    transform: none;
  }

  .record-btn.disabled:hover {
    background-color: var(--background-modifier-border);
    transform: none;
  }

  .recording-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.85em;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
  }

  .label {
    color: var(--text-muted);
  }

  .value {
    color: var(--text-normal);
    font-weight: 500;
  }
</style>
