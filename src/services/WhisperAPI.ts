export interface WhisperResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface WhisperOptions {
  model?: string;
  language?: string;
  response_format?: 'json' | 'text' | 'verbose_json';
  temperature?: number;
  prompt?: string;
}

export class WhisperAPI {
  private apiKey: string;
  private baseURL: string = 'https://api.openai.com/v1';
  private requestQueue: Array<{
    audioBlob: Blob;
    options: WhisperOptions;
    resolve: (result: WhisperResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBlob: Blob, options: WhisperOptions = {}): Promise<WhisperResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        audioBlob,
        options: {
          model: 'whisper-1',
          response_format: 'json',
          ...options
        },
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        const result = await this.makeTranscriptionRequest(
          request.audioBlob,
          request.options
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error as Error);
      }

      // Small delay between requests to avoid rate limiting
      await this.delay(200);
    }

    this.isProcessing = false;
  }

  private async makeTranscriptionRequest(
    audioBlob: Blob,
    options: WhisperOptions,
    retryCount = 0
  ): Promise<WhisperResponse> {
    try {
      const formData = new FormData();
      
      // Convert blob to file with proper extension
      const audioFile = new File([audioBlob], `audio.${this.getFileExtension(audioBlob)}`, {
        type: audioBlob.type
      });
      
      formData.append('file', audioFile);
      formData.append('model', options.model || 'whisper-1');
      
      if (options.language && options.language !== 'auto') {
        formData.append('language', options.language);
      }
      
      if (options.response_format) {
        formData.append('response_format', options.response_format);
      }
      
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Handle different response formats
      if (typeof result === 'string') {
        return { text: result };
      }
      
      return result as WhisperResponse;

    } catch (error) {
      // Retry logic for transient errors
      if (retryCount < this.maxRetries && this.isRetryableError(error as Error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeTranscriptionRequest(audioBlob, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('rate limit')
    );
  }

  private getFileExtension(blob: Blob): string {
    const mimeType = blob.type;
    
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    
    return 'webm'; // Default fallback
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  clearQueue(): void {
    // Reject all pending requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Request cancelled'));
    });
    this.requestQueue = [];
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }

  get processing(): boolean {
    return this.isProcessing;
  }
}
