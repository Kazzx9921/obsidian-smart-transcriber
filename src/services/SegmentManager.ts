import { AudioRecorder, type AudioSegment } from './AudioRecorder';
import { WhisperAPI, type WhisperOptions } from './WhisperAPI';

export interface TranscriptSegment {
  id: string;
  timestamp: Date;
  text: string;
  isProcessing: boolean;
  audioSegment?: AudioSegment;
  confidence?: number;
}

export interface SegmentManagerOptions {
  apiKey: string;
  segmentDuration?: number;
  silenceThreshold?: number;
  whisperOptions?: WhisperOptions;
  onSegmentUpdate?: (segment: TranscriptSegment) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

export class SegmentManager {
  private audioRecorder: AudioRecorder;
  private whisperAPI: WhisperAPI;
  private options: SegmentManagerOptions;
  private segments: Map<string, TranscriptSegment> = new Map();
  private isInitialized = false;

  constructor(options: SegmentManagerOptions) {
    this.options = options;
    this.whisperAPI = new WhisperAPI(options.apiKey);
    
    this.audioRecorder = new AudioRecorder({
      segmentDuration: options.segmentDuration || 8,
      silenceThreshold: options.silenceThreshold || 0.01,
      onSegmentReady: this.handleAudioSegment.bind(this),
      onAudioLevel: options.onAudioLevel,
      onError: options.onError
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.audioRecorder.initialize();
      this.isInitialized = true;
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SegmentManager not initialized. Call initialize() first.');
    }

    try {
      await this.audioRecorder.startRecording();
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  stopRecording(): void {
    this.audioRecorder.stopRecording();
  }

  private async handleAudioSegment(audioSegment: AudioSegment): Promise<void> {
    // Create initial transcript segment
    const transcriptSegment: TranscriptSegment = {
      id: audioSegment.id,
      timestamp: audioSegment.timestamp,
      text: '',
      isProcessing: true,
      audioSegment
    };

    // Store segment and notify
    this.segments.set(audioSegment.id, transcriptSegment);
    this.options.onSegmentUpdate?.(transcriptSegment);

    try {
      // Send to Whisper API for transcription
      const whisperResponse = await this.whisperAPI.transcribe(
        audioSegment.audioBlob,
        this.options.whisperOptions
      );

      // Update segment with transcription result
      transcriptSegment.text = whisperResponse.text.trim();
      transcriptSegment.isProcessing = false;

      // Store updated segment and notify
      this.segments.set(audioSegment.id, transcriptSegment);
      this.options.onSegmentUpdate?.(transcriptSegment);

    } catch (error) {
      // Update segment with error state
      transcriptSegment.text = '[Transcription failed]';
      transcriptSegment.isProcessing = false;
      
      this.segments.set(audioSegment.id, transcriptSegment);
      this.options.onSegmentUpdate?.(transcriptSegment);
      
      this.options.onError?.(error as Error);
    }
  }

  getSegment(id: string): TranscriptSegment | undefined {
    return this.segments.get(id);
  }

  getAllSegments(): TranscriptSegment[] {
    return Array.from(this.segments.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  updateSegmentText(id: string, text: string): boolean {
    const segment = this.segments.get(id);
    if (segment) {
      segment.text = text;
      this.segments.set(id, segment);
      this.options.onSegmentUpdate?.(segment);
      return true;
    }
    return false;
  }

  deleteSegment(id: string): boolean {
    return this.segments.delete(id);
  }

  clearAllSegments(): void {
    this.segments.clear();
  }

  exportTranscript(options: {
    includeTimestamps?: boolean;
    format?: 'text' | 'json';
  } = {}): string {
    const segments = this.getAllSegments().filter(s => !s.isProcessing);
    
    if (options.format === 'json') {
      return JSON.stringify(segments, null, 2);
    }

    // Text format
    return segments
      .map(segment => {
        const timestamp = options.includeTimestamps 
          ? `[${segment.timestamp.toLocaleTimeString()}] `
          : '';
        return `${timestamp}${segment.text}`;
      })
      .join('\n');
  }

  updateSettings(settings: {
    apiKey?: string;
    segmentDuration?: number;
    silenceThreshold?: number;
    whisperOptions?: WhisperOptions;
  }): void {
    if (settings.apiKey) {
      this.whisperAPI.updateApiKey(settings.apiKey);
    }

    if (settings.segmentDuration || settings.silenceThreshold) {
      this.audioRecorder.updateSettings({
        segmentDuration: settings.segmentDuration,
        silenceThreshold: settings.silenceThreshold
      });
    }

    if (settings.whisperOptions) {
      this.options.whisperOptions = { ...this.options.whisperOptions, ...settings.whisperOptions };
    }
  }

  getCurrentAudioLevel(): number {
    return this.audioRecorder.getCurrentAudioLevel();
  }

  getProcessingQueueLength(): number {
    return this.whisperAPI.getQueueLength();
  }

  dispose(): void {
    this.audioRecorder.dispose();
    this.whisperAPI.clearQueue();
    this.segments.clear();
    this.isInitialized = false;
  }

  get recording(): boolean {
    return this.audioRecorder.recording;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get processing(): boolean {
    return this.whisperAPI.processing;
  }
}
