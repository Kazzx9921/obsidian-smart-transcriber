export interface VoiceTranscriberSettings {
	// OpenAI API settings
	openaiApiKey: string;
	whisperModel: string;
	
	// Recording settings
	segmentDuration: number; // in seconds (5-10)
	
	// Smart segmentation settings
	pauseThreshold: number; // pause duration before uploading segment (ms)
	
	// Language settings
	language: string; // language code for Whisper API
	enableTranslation: boolean;
	
	// UI settings
	autoScroll: boolean;
}

export const DEFAULT_SETTINGS: VoiceTranscriberSettings = {
	openaiApiKey: '',
	whisperModel: 'whisper-1',
	segmentDuration: 8, // 8 seconds default
	pauseThreshold: 50, // 50ms pause before upload (ultra-responsive)
	language: 'auto', // auto-detect
	enableTranslation: false,
	autoScroll: true
};
