<script lang="ts">
  import type OBWhisperingPlugin from '../../main';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';
  import SimpleVoiceRecorder from './SimpleVoiceRecorder.svelte';

  // Props
  export let plugin: OBWhisperingPlugin;
  export let settings: VoiceTranscriberSettings;

  // App state
  let isRecording = false;
  let recordingTime = 0;
  let isInitializing = false;
  let transcriptSegments: Array<{
    id: string;
    timestamp: Date;
    text: string;
    isProcessing: boolean;
  }> = [];
  
  // Computed full transcript text
  $: fullTranscript = transcriptSegments
    .filter(segment => !segment.isProcessing && segment.text.trim() && !segment.text.includes('[No speech detected]'))
    .map(segment => segment.text.trim())
    .join('\n');

  // Editable transcript that users can modify
  let editableTranscript = '';
  let lastFullTranscript = '';
  
  // Update editable transcript only when new content is added (not when user edits)
  $: {
    if (fullTranscript !== lastFullTranscript && fullTranscript.length > lastFullTranscript.length) {
      // Only append new content if user hasn't modified the transcript
      if (editableTranscript === lastFullTranscript) {
        editableTranscript = fullTranscript;
      } else {
        // If user has modified, append only the new part
        const newContent = fullTranscript.substring(lastFullTranscript.length);
        if (newContent.trim()) {
          editableTranscript += (editableTranscript ? '\n' : '') + newContent;
        }
      }
      lastFullTranscript = fullTranscript;
    }
  }

  function handleTranscriptEdit() {
    // User is editing, don't interfere
  }

  console.log('VoiceTranscriberApp loaded', { plugin: !!plugin, settings: !!settings });

  // Watch for settings changes to update button states
  $: hasApiKey = settings.openaiApiKey && settings.openaiApiKey.length > 0;

  // Recording state handlers
  function handleStartRecording() {
    isRecording = true;
    console.log('Starting recording...');
  }

  function handleStopRecording() {
    isRecording = false;
    recordingTime = 0;
    console.log('Stopping recording...');
  }

  function handleTimeUpdate(time: number) {
    recordingTime = time;
  }

  // This will be controlled by SimpleVoiceRecorder
  let voiceRecorderRef;

  function handleToggleRecording() {
    if (voiceRecorderRef) {
      voiceRecorderRef.toggleRecording();
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleNewSegment(segment: { id: string; timestamp: Date; text: string; isProcessing: boolean }) {
    // Check if this segment already exists (for updates)
    const existingIndex = transcriptSegments.findIndex(s => s.id === segment.id);
    
    if (existingIndex >= 0) {
      // Update existing segment
      transcriptSegments[existingIndex] = segment;
      transcriptSegments = [...transcriptSegments]; // Trigger reactivity
      console.log('Segment updated:', segment);
    } else {
      // Add new segment
      transcriptSegments = [...transcriptSegments, segment];
      console.log('New segment added:', segment);
    }
    
    // Clean up old processing segments that never got completed (after 30 seconds)
    const now = new Date();
    transcriptSegments = transcriptSegments.filter(s => {
      if (s.isProcessing) {
        const age = now.getTime() - s.timestamp.getTime();
        return age < 30000; // Keep processing segments for max 30 seconds
      }
      return true;
    });
    
    // No limit on segments - keep all transcripts
  }

  function handleClearTranscripts() {
    transcriptSegments = [];
    editableTranscript = '';
    lastFullTranscript = '';
    console.log('Transcripts cleared');
  }

  async function handleInsertToNote() {
    if (!editableTranscript.length) return;
    
    try {
      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) {
        // 如果沒有打開的筆記，可以顯示提示或創建新筆記
        console.log('No active note found');
        return;
      }

      // 獲取當前文件內容
      const currentContent = await app.vault.read(activeFile);
      
      // 在文件末尾添加轉錄內容
      const newContent = currentContent + '\n\n' + editableTranscript;
      
      // 寫入文件
      await app.vault.modify(activeFile, newContent);
      
      console.log('Transcript inserted to note:', activeFile.name);
    } catch (error) {
      console.error('Failed to insert transcript:', error);
    }
  }

</script>

<div class="voice-transcriber-app">
  <!-- Header -->
  <div class="vt-header">
    <h3>Smart Transcribe</h3>
    {#if isRecording}
      <div class="header-timer">
        {formatTime(recordingTime)}
      </div>
    {/if}
  </div>

  <!-- Control Buttons -->
  <div class="control-buttons">
    <button 
      class="control-btn start-btn"
      on:click={handleToggleRecording}
      disabled={!hasApiKey || isInitializing}
      title={isRecording ? 'Pause recording' : 'Start recording'}
    >
      {isInitializing ? 'Initializing...' : isRecording ? 'Pause' : 'Start'}
    </button>
    
    <button 
      class="control-btn"
      on:click={handleInsertToNote}
      disabled={!editableTranscript.length}
      title="Insert to current note"
    >
      Insert
    </button>
    
    <button 
      class="control-btn copy-btn"
      on:click={() => navigator.clipboard.writeText(editableTranscript)}
      disabled={!editableTranscript.length}
      title="Copy all text"
    >
      Copy
    </button>
    
    <button 
      class="control-btn clear-btn"
      on:click={handleClearTranscripts}
      disabled={!editableTranscript.length}
      title="Clear all transcripts"
    >
      Clear
    </button>
  </div>

  <!-- Voice Recorder Component -->
  <SimpleVoiceRecorder
    bind:this={voiceRecorderRef}
    {settings}
    onstart={handleStartRecording}
    onstop={handleStopRecording}
    onnewsegment={handleNewSegment}
    ontimeupdate={handleTimeUpdate}
    oninitializing={(initializing) => isInitializing = initializing}
  />
    
  <!-- Editable Transcript -->
  <textarea 
    class="transcript-textarea"
    bind:value={editableTranscript}
    placeholder="Transcribed text will appear here..."
    on:input={handleTranscriptEdit}
  ></textarea>
  
</div>

<style>
  .voice-transcriber-app {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .vt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--background-modifier-border);
    padding-bottom: 8px;
  }

  .vt-header h3 {
    margin: 0;
    font-size: 1.1em;
    font-weight: 600;
    color: var(--text-normal);
  }

  .header-timer {
    font-family: monospace;
    font-size: 1em;
    font-weight: 400;
    color: var(--text-muted);
    opacity: 0.7;
  }

  .control-buttons {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    flex: 1;
    background: none;
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s ease;
    box-shadow: none;
  }

  .control-btn:hover:not(:disabled) {
    background-color: var(--background-modifier-hover);
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .transcript-textarea {
    flex: 1 1 auto;
    flex-grow: 1;
    width: 100%;
    height: 0;
    min-height: 300px;
    max-height: none;
    resize: vertical;
    font-family: var(--font-text);
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    outline: none;
    border-radius: 6px;
    padding: 12px;
    line-height: 1.6;
    font-size: 0.9em;
    color: var(--text-normal);
    pointer-events: auto;
    z-index: 1;
    overflow-y: auto;
  }

  .transcript-textarea:focus {
    border-color: var(--text-normal);
    box-shadow: none;
    outline: none;
  }





  button {
    background: none;
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: var(--background-modifier-hover);
  }
</style>
