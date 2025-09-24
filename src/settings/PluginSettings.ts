export interface VoiceTranscriberSettings {
	// OpenAI API settings
	openaiApiKey: string;
	whisperModel: string;
	
	// Recording settings
	segmentDuration: number; // in seconds (5-10)
	
	// Smart segmentation settings
	pauseThreshold: number; // pause duration before uploading segment (ms)
	minSegmentDuration: number; // minimum segment duration before upload (seconds)
	
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
	pauseThreshold: 1000, // 1 second pause before upload
	minSegmentDuration: 3, // minimum 3 seconds before upload
	language: 'auto', // auto-detect
	enableTranslation: false,
	autoScroll: true
};
