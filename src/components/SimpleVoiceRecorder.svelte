<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { VoiceTranscriberSettings } from '../settings/PluginSettings';
  import { WhisperAPI } from '../services/WhisperAPI';
  import { VoiceActivityDetector, type VoiceDetectionResult } from '../services/VoiceActivityDetector';
  import { SignalProcessor } from '../utils/SignalProcessor';

  // Props
  export let settings: VoiceTranscriberSettings;
  export let onstart: () => void;
  export let onstop: () => void;
  export let onnewsegment: (segment: { id: string; timestamp: Date; text: string; isProcessing: boolean }) => void;
  export let ontimeupdate: (time: number) => void;
  export let oninitializing: (initializing: boolean) => void;

  // Recording state
  let audioLevel = 0;
  let recordingTime = 0;
  let recordingTimer: number | null = null;
  let internalIsRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  let initializationError: string | null = null;
  let isInitializing = false;
  let whisperAPI: WhisperAPI | null = null;
  let recordingChunks: Blob[] = [];
  let segmentTimer: number | null = null;

  // Voice detection state
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array | null = null;
  let voiceDetectionTimer: number | null = null;
  let isVoiceActive = false;
  let currentAudioLevelDb = -100;
  
  // Smart voice detection
  let voiceDetector: VoiceActivityDetector | null = null;
  let signalProcessor: SignalProcessor | null = null;
  let detectionResult: VoiceDetectionResult | null = null;

  // Smart timing state
  let activeRecordingTime = 0;        // Only counts when voice is active (累積顯示)
  let totalRecordingTime = 0;         // Internal total time
  let segmentRecordingTime = 0;       // Time since last segment (用於分段計算)
  let isSegmentReady = false;         // Whether segment is ready for upload
  let lastVoiceEndTime = 0;           // Timestamp when voice stopped
  let wasVoiceActive = false;         // Previous voice state for change detection

  // Initialize recording
  async function initializeRecording() {
    if (!settings.openaiApiKey) {
      initializationError = 'OpenAI API key is required. Please configure it in settings.';
      return false;
    }

    isInitializing = true;
    oninitializing(true);
    initializationError = null;

    try {
      // Initialize Whisper API
      whisperAPI = new WhisperAPI(settings.openaiApiKey);

      // Request audio access (simplified - always use microphone)
      audioStream = await getAudioStream();

      // Setup audio context for voice detection
      await setupAudioAnalysis(audioStream);

      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        initializationError = `Recording error: ${event}`;
      });

      console.log('Recording initialized successfully');
      return true;
    } catch (error) {
      initializationError = `Failed to initialize recording: ${(error as Error).message}`;
      return false;
    } finally {
      isInitializing = false;
      oninitializing(false);
    }
  }

  async function setupAudioAnalysis(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      audioContext = new AudioContext();
      
      // Create analyser node
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // Create source from stream and connect to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Create data array for frequency data
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Initialize smart voice detection
      voiceDetector = new VoiceActivityDetector(analyser);
      signalProcessor = new SignalProcessor(analyser.frequencyBinCount);
      
      console.log('Smart voice detection system initialized');
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
      // Continue without voice detection if setup fails
    }
  }

  function startVoiceDetection(): void {
    if (!analyser || !dataArray || !voiceDetector || !signalProcessor) return;
    
    voiceDetectionTimer = window.setInterval(() => {
      if (!analyser || !dataArray || !voiceDetector || !signalProcessor) return;
      
      // Smart voice detection
      detectionResult = voiceDetector.detectVoiceActivity();
      
      // Process signal for noise reduction
      const timeData = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(timeData);
      const timeSignal = new Float32Array(timeData.length);
      for (let i = 0; i < timeData.length; i++) {
        timeSignal[i] = (timeData[i] - 128) / 128.0;
      }
      
      // Get frequency data for signal processing
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      const spectrum = new Float32Array(frequencyData.length);
      for (let i = 0; i < frequencyData.length; i++) {
        spectrum[i] = frequencyData[i] / 255.0;
      }
      
      // Process signal with noise reduction
      const processedSpectrum = signalProcessor.processSignal(
        spectrum,
        timeSignal,
        detectionResult.isHumanVoice,
        voiceDetector.getBackgroundNoiseLevel()
      );
      
      // Update voice state based on smart detection (加入 Audio Level 過濾)
      const MIN_AUDIO_LEVEL = 20; // 過濾掉低於此級別的音頻
      const voiceDetected = detectionResult.isHumanVoice && 
                           detectionResult.confidence > 0.3 && 
                           detectionResult.audioLevel > MIN_AUDIO_LEVEL;
      
      // 詳細調試信息 (降低頻率以減少CPU負擔)
      if (Math.random() < 0.1) { // 只有10%的機率輸出日誌
        console.log(`Detection Result:`, {
          isHumanVoice: detectionResult.isHumanVoice,
          isComputerAudio: detectionResult.isComputerAudio,
          confidence: (detectionResult.confidence * 100).toFixed(1) + '%',
          audioLevel: detectionResult.audioLevel.toFixed(1),
          audioLevelPass: detectionResult.audioLevel > MIN_AUDIO_LEVEL,
          voiceDetected: voiceDetected,
          currentIsVoiceActive: isVoiceActive
        });
      }

      // Handle voice state changes
      if (voiceDetected && !isVoiceActive) {
        isVoiceActive = true;
        console.log(`✅ Human voice detected (confidence: ${(detectionResult.confidence * 100).toFixed(1)}%)`);
      } else if (!voiceDetected && isVoiceActive) {
        isVoiceActive = false;
        console.log(`❌ Voice stopped (confidence: ${(detectionResult.confidence * 100).toFixed(1)}%)`);
      }
      
      // Update audio level for display
      audioLevel = detectionResult.audioLevel;
      
      // Smart segmentation logic
      handleSmartSegmentation();
      
    }, 10); // Ultra-high frequency for 10ms precision detection
  }

  function handleSmartSegmentation(): void {
    const now = Date.now();
    
    // Track voice state changes
    if (!isVoiceActive && wasVoiceActive) {
      // Voice just stopped
      lastVoiceEndTime = now;
      wasVoiceActive = false;
      console.log(`Voice ended, starting pause timer...`);
    } else if (isVoiceActive && !wasVoiceActive) {
      // Voice just started
      wasVoiceActive = true;
    }
    
    // Check if we should upload a segment
    if (isSegmentReady && !isVoiceActive) {
      const silenceDuration = now - lastVoiceEndTime;
      
      if (silenceDuration >= settings.pauseThreshold) {
        console.log(`Uploading segment after ${silenceDuration}ms of silence (${segmentRecordingTime}s segment, ${activeRecordingTime}s total)`);
        uploadCurrentSegment();
        
        // Reset segment states for next interval
        isSegmentReady = false;
        segmentRecordingTime = 0;  // 重置分段計時，開始下一個週期
        // NOTE: activeRecordingTime 保持累積，不重置
      }
    }
  }

  function uploadCurrentSegment(): void {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log(`Uploading segment with ${activeRecordingTime}s of active speech`);
      
      // Stop current recording to trigger dataavailable event
      mediaRecorder.stop();
      
      // Short delay before restarting recording
      setTimeout(() => {
        if (internalIsRecording && mediaRecorder) {
          recordingChunks = [];
          mediaRecorder.start();
          console.log('Recording restarted for next segment');
        }
      }, 100);
    }
  }

  function stopVoiceDetection(): void {
    if (voiceDetectionTimer) {
      clearInterval(voiceDetectionTimer);
      voiceDetectionTimer = null;
    }
    isVoiceActive = false;
    currentAudioLevelDb = -100;
    detectionResult = null;
    
    // Reset signal processor
    if (signalProcessor) {
      signalProcessor.reset();
    }
  }

  async function getAudioStream(): Promise<MediaStream> {
    console.log('Getting microphone audio with smart voice detection');
    
    // Simplified audio constraints optimized for voice detection
    const audioConstraints = {
      echoCancellation: false,    // Disable to preserve voice characteristics
      noiseSuppression: false,    // We handle this with our own algorithms
      autoGainControl: false,     // Keep original levels for better analysis
      sampleRate: 44100          // Standard sample rate for good frequency resolution
    };

    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    });
  }

  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using MIME type:', type);
        return type;
      }
    }
    
    console.log('Using default MIME type (browser will choose)');
    return '';
  }

  async function handleDataAvailable(event: BlobEvent) {
    if (event.data.size > 0) {
      recordingChunks.push(event.data);
      
      // Create audio blob from chunks
      const audioBlob = new Blob(recordingChunks, { 
        type: mediaRecorder?.mimeType || 'audio/webm' 
      });
      
      // Only process segments with actual audio content
      if (audioBlob.size > 1000) { // Minimum size check (1KB)
        await processAudioSegment(audioBlob);
      }
      
      // Clear chunks for next segment
      recordingChunks = [];
    }
  }

  async function processAudioSegment(audioBlob: Blob) {
    const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create initial processing segment
    const processingSegment = {
      id: segmentId,
      timestamp: new Date(),
      text: '',
      isProcessing: true
    };
    
    // Notify parent component about new segment
    onnewsegment(processingSegment);
    
    try {
      console.log('Sending audio segment to Whisper API...', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      // Send to Whisper API
      const whisperResponse = await whisperAPI!.transcribe(audioBlob, {
        model: settings.whisperModel,
        language: settings.language === 'auto' ? undefined : settings.language,
        response_format: 'json'
      });
      
      console.log('Received transcription:', whisperResponse);
      
      const transcribedText = whisperResponse.text.trim();
      
      // Only add segments with actual speech content
      if (transcribedText && transcribedText.length > 0) {
        const completedSegment = {
          id: segmentId,
          timestamp: processingSegment.timestamp,
          text: transcribedText,
          isProcessing: false
        };
        
        // Notify parent component about completed segment
        onnewsegment(completedSegment);
      } else {
        console.log('No speech detected in segment, skipping...');
        // Remove the processing segment since there's no content
        // We don't call onnewsegment, so the processing segment will be filtered out
      }
      
    } catch (error) {
      console.error('Transcription failed:', error);
      
      // 靜默處理錯誤，不顯示錯誤訊息給用戶
      // 只在控制台記錄錯誤，不添加到轉錄結果中
    }
  }


  async function startRecording() {
    if (!mediaRecorder) {
      const initialized = await initializeRecording();
      if (!initialized) return;
    }

    try {
      // Clear any existing chunks
      recordingChunks = [];
      
      // Start recording
      mediaRecorder?.start();
      internalIsRecording = true;
      onstart();
      
      // Initialize smart timing states
      recordingTime = 0;
      activeRecordingTime = 0;
      totalRecordingTime = 0;
      segmentRecordingTime = 0;
      isSegmentReady = false;
      lastVoiceEndTime = 0;
      wasVoiceActive = false;
      isVoiceActive = false;
      currentAudioLevelDb = -100;
      
      // Start smart timer
      recordingTimer = window.setInterval(() => {
        totalRecordingTime++; // Internal total time always increases
        
        // Only increment active time when voice is detected
        if (isVoiceActive) {
          activeRecordingTime++;      // 累積顯示時間 (持續增加)
          segmentRecordingTime++;     // 分段計算時間 (會重置)
          console.log(`Active time: ${activeRecordingTime}s, Segment time: ${segmentRecordingTime}s (voice detected)`);
          
          // Check if we've reached segment duration (使用分段時間)
          if (segmentRecordingTime >= settings.segmentDuration && !isSegmentReady) {
            isSegmentReady = true;
            console.log(`Segment ready after ${segmentRecordingTime}s, waiting for voice pause...`);
          }
        } else {
          console.log(`Active time: ${activeRecordingTime}s, Segment time: ${segmentRecordingTime}s (voice paused)`);
        }
        
        // Send active recording time to UI (smart timing display)
        ontimeupdate(activeRecordingTime);
        
        // Audio level is now updated in startVoiceDetection() from smart detection
        // audioLevel = detectionResult?.audioLevel || 0;
      }, 1000);

      // Start voice detection (includes smart segmentation)
      startVoiceDetection();

      console.log('Recording started');
    } catch (error) {
      initializationError = `Failed to start recording: ${(error as Error).message}`;
    }
  }


  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    internalIsRecording = false;
    onstop();
    
    // Clear timers
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    if (segmentTimer) {
      clearInterval(segmentTimer);
      segmentTimer = null;
    }
    
    // Stop voice detection
    stopVoiceDetection();
    
    // Reset all timing states
    audioLevel = 0;
    recordingTime = 0;
    activeRecordingTime = 0;
    totalRecordingTime = 0;
    segmentRecordingTime = 0;
    isSegmentReady = false;
    lastVoiceEndTime = 0;
    wasVoiceActive = false;

    console.log('Recording stopped');
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Update Whisper API when settings change
  $: if (whisperAPI && settings.openaiApiKey) {
    whisperAPI.updateApiKey(settings.openaiApiKey);
  }

  // Export toggle function for parent to call
  export function toggleRecording() {
    if (internalIsRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    if (segmentTimer) {
      clearInterval(segmentTimer);
    }
    stopVoiceDetection();
    if (audioContext) {
      audioContext.close();
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    if (whisperAPI) {
      whisperAPI.clearQueue();
    }
  });
</script>

<!-- Error Display -->
{#if initializationError}
  <div class="error-message">
    <span class="error-text">{initializationError}</span>
  </div>
{/if}

<style>

  .error-message {
    padding: 8px 12px;
    margin-bottom: 12px;
    background-color: var(--background-modifier-error);
    border-radius: 6px;
    font-size: 0.85em;
    text-align: center;
  }

  .error-text {
    color: var(--text-error);
  }

</style>
