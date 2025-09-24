export interface AudioSegment {
  id: string;
  audioBlob: Blob;
  timestamp: Date;
  duration: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordingChunks: Blob[] = [];
  private segmentTimer: number | null = null;
  private isRecording = false;
  
  // Settings
  private segmentDuration: number = 8; // seconds
  private silenceThreshold: number = 0.01;
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  // Callbacks
  private onSegmentReady?: (segment: AudioSegment) => void;
  private onAudioLevel?: (level: number) => void;
  private onError?: (error: Error) => void;

  constructor(options: {
    segmentDuration?: number;
    silenceThreshold?: number;
    onSegmentReady?: (segment: AudioSegment) => void;
    onAudioLevel?: (level: number) => void;
    onError?: (error: Error) => void;
  } = {}) {
    this.segmentDuration = options.segmentDuration ?? 8;
    this.silenceThreshold = options.silenceThreshold ?? 0.01;
    this.onSegmentReady = options.onSegmentReady;
    this.onAudioLevel = options.onAudioLevel;
    this.onError = options.onError;
  }

  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Setup audio context for level monitoring
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Setup MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.addEventListener('dataavailable', this.handleDataAvailable.bind(this));
      this.mediaRecorder.addEventListener('error', (event) => {
        this.onError?.(new Error(`MediaRecorder error: ${event}`));
      });

    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return ''; // Let browser choose
  }

  async startRecording(): Promise<void> {
    if (!this.mediaRecorder || this.isRecording) {
      throw new Error('Recorder not initialized or already recording');
    }

    this.isRecording = true;
    this.recordingChunks = [];
    
    // Start recording
    this.mediaRecorder.start();
    
    // Start segment timer
    this.startSegmentTimer();
    
    // Start audio level monitoring
    this.startAudioLevelMonitoring();
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.isRecording = false;
    
    // Stop recording
    this.mediaRecorder.stop();
    
    // Clear timers
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
    
    // Stop audio level monitoring
    this.stopAudioLevelMonitoring();
  }

  private startSegmentTimer(): void {
    this.segmentTimer = window.setInterval(() => {
      if (this.isRecording && this.mediaRecorder?.state === 'recording') {
        // Stop and restart recording to create a segment
        this.mediaRecorder.stop();
        setTimeout(() => {
          if (this.isRecording) {
            this.recordingChunks = [];
            this.mediaRecorder?.start();
          }
        }, 100);
      }
    }, this.segmentDuration * 1000);
  }

  private startAudioLevelMonitoring(): void {
    const monitorLevel = () => {
      if (!this.isRecording || !this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i] * this.dataArray[i];
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      const level = rms / 255; // Normalize to 0-1
      
      this.onAudioLevel?.(level);
      
      // Continue monitoring
      if (this.isRecording) {
        requestAnimationFrame(monitorLevel);
      }
    };
    
    monitorLevel();
  }

  private stopAudioLevelMonitoring(): void {
    // Audio level monitoring stops automatically when isRecording becomes false
  }

  private handleDataAvailable(event: BlobEvent): void {
    if (event.data.size > 0) {
      this.recordingChunks.push(event.data);
      
      // Create audio segment
      const audioBlob = new Blob(this.recordingChunks, { 
        type: this.mediaRecorder?.mimeType || 'audio/webm' 
      });
      
      // Only process segments with actual audio content
      if (audioBlob.size > 1000) { // Minimum size check
        const segment: AudioSegment = {
          id: this.generateSegmentId(),
          audioBlob,
          timestamp: new Date(),
          duration: this.segmentDuration
        };
        
        this.onSegmentReady?.(segment);
      }
    }
  }

  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return rms / 255;
  }

  updateSettings(settings: { segmentDuration?: number; silenceThreshold?: number }): void {
    if (settings.segmentDuration) {
      this.segmentDuration = settings.segmentDuration;
    }
    if (settings.silenceThreshold !== undefined) {
      this.silenceThreshold = settings.silenceThreshold;
    }
  }

  dispose(): void {
    this.stopRecording();
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.mediaRecorder = null;
    this.analyser = null;
    this.dataArray = null;
  }

  get recording(): boolean {
    return this.isRecording;
  }
}
