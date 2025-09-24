# Smart Transcriber - Obsidian Voice Transcription Plugin

Advanced real-time voice transcription plugin for Obsidian using OpenAI Whisper API with intelligent voice detection and smart timing features. Record audio and get accurate transcripts with advanced voice activity detection.

## Features

- 🎤 **Smart Voice Detection**: Advanced voice activity detection with human voice recognition
- 🧠 **Intelligent Timing**: Smart segmentation based on actual voice activity, not fixed time intervals  
- 🔇 **Noise Suppression**: Built-in signal processing to filter out background noise and computer audio
- 🤖 **AI Transcription**: Uses OpenAI Whisper API for highly accurate speech-to-text conversion
- 📝 **Real-time Display**: Live transcription updates in the sidebar as you speak
- ✏️ **Editable Results**: Click to edit and refine transcription results
- 🌍 **Multi-language Support**: Auto-detection or manual selection from 12+ languages
- 🎯 **Adaptive Segmentation**: Uploads segments only when voice pauses are detected
- ⚙️ **Advanced Settings**: Fine-tune voice detection, pause thresholds, and segment durations
- 📊 **Audio Level Monitoring**: Real-time audio level visualization with voice activity indicators

## Installation

### Development Installation

1. Clone this repository to your Obsidian plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/Kazzx9921/obsidian-smart-transcriber
   cd smart-transcriber
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian settings

### Production Installation

1. Download the latest release from the releases page
2. Extract to your vault's `.obsidian/plugins/smart-transcriber/` folder
3. Enable the plugin in Obsidian settings

## Setup

1. **Get OpenAI API Key**: 
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Make sure you have credits available

2. **Configure Plugin**:
   - Open Smart Transcriber settings in Obsidian Settings > Community plugins > Smart Transcriber
   - Enter your OpenAI API key and click "Verify" to test it
   - Adjust recording settings (segment duration, pause threshold, etc.)
   - Configure language settings and voice detection parameters

## Usage

### Basic Recording

1. **Open Sidebar**: Click the microphone icon in the ribbon or use the command palette
2. **Start Recording**: Click the record button to begin voice transcription
3. **Grant Permissions**: Allow microphone access when prompted
4. **Smart Detection**: The plugin automatically detects when you're speaking vs. background noise
5. **Live Transcripts**: Watch as your speech is transcribed in real-time with intelligent segmentation
6. **Stop Recording**: Click the button again to stop

### Advanced Features

#### Smart Voice Detection
- **Human Voice Recognition**: Distinguishes between human speech and computer audio
- **Confidence Scoring**: Only processes audio with high confidence voice detection
- **Background Noise Filtering**: Automatically filters out ambient noise and system sounds
- **Adaptive Thresholds**: Learns and adapts to your voice patterns and environment

#### Intelligent Timing & Segmentation
- **Activity-Based Timing**: Timer only counts when voice is actively detected
- **Smart Pause Detection**: Automatically uploads segments when voice pauses are detected
- **Minimum Duration Control**: Ensures segments have sufficient content before processing
- **Configurable Thresholds**: Adjust pause detection and minimum segment durations

#### Settings Configuration

- **Segment Duration**: Target duration for voice segments (3-30 seconds of active speech)
- **Pause Detection Threshold**: How long to wait after voice stops before uploading (500ms-3000ms)
- **Minimum Segment Duration**: Minimum active speech time before creating a segment (1-10 seconds)
- **Language**: Choose from 12+ languages or use auto-detection
- **Translation**: Enable to translate non-English audio to English
- **Audio Level Monitoring**: Real-time visual feedback of voice detection confidence

#### Editing Transcripts

- Click on any transcript segment to edit the text
- Use the copy button to copy individual segments
- Export all transcripts to a text file

#### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + M`: Toggle recording
- `Ctrl/Cmd + Shift + T`: Open/close transcript sidebar

## Technical Details

### Architecture

- **Frontend**: Svelte 4 + TypeScript
- **Audio Processing**: Web Audio API with MediaRecorder
- **Build System**: esbuild with Svelte plugin
- **API Integration**: OpenAI Whisper API

### File Structure

```
smart-transcriber/
├── src/
│   ├── components/          # Svelte UI components
│   │   ├── SimpleVoiceRecorder.svelte    # Main recording interface
│   │   ├── VoiceTranscriberApp.svelte    # App container
│   │   ├── TranscriptDisplay.svelte      # Transcript display
│   │   ├── SimpleSettingsPanel.svelte    # Settings UI
│   │   └── TestComponent.svelte          # Testing components
│   ├── services/            # Core business logic
│   │   ├── VoiceActivityDetector.ts      # Smart voice detection
│   │   ├── WhisperAPI.ts                 # OpenAI API integration
│   │   ├── AudioRecorder.ts              # Audio capture
│   │   ├── SegmentManager.ts             # Segment management
│   │   └── AudioSourceManager.ts         # Audio source handling
│   ├── utils/               # Utility functions
│   │   ├── SignalProcessor.ts            # Audio signal processing
│   │   └── AudioLevelConverter.ts        # Audio level calculations
│   ├── settings/            # Plugin configuration
│   │   ├── PluginSettings.ts             # Settings interface
│   │   └── SettingTab.ts                 # Settings UI tab
│   └── views/               # Obsidian integration
│       └── SidebarView.ts               # Sidebar view implementation
├── main.ts                  # Plugin entry point
├── manifest.json           # Plugin metadata
└── esbuild.config.mjs      # Build configuration
```

### Performance Optimizations

- **Smart Segmentation**: Voice activity-based chunking eliminates empty segments
- **Intelligent Queuing**: Sequential API requests with smart retry logic
- **Real-time Processing**: 50ms detection intervals for responsive voice activity detection
- **Memory Management**: Automatic cleanup of processed audio segments
- **Background Noise Reduction**: Built-in signal processing reduces API costs
- **Adaptive Confidence Scoring**: Dynamic thresholds based on environment conditions

## Troubleshooting

### Common Issues

**"OpenAI API key is required"**
- Enter a valid API key in Smart Transcriber settings
- Use the "Verify" button to test your API key
- Ensure your OpenAI account has available credits

**"Failed to initialize: Permission denied"**
- Grant microphone permission when prompted by your browser
- Check system privacy settings (macOS: System Settings > Privacy & Security > Microphone)
- Restart Obsidian if permissions were recently changed

**"Voice not detected" or "No transcription"**
- Check if your microphone is working in other applications
- Adjust the audio level - speak louder or move closer to microphone
- Try adjusting the "Pause Detection Threshold" in settings
- Ensure background noise isn't too high

**"Transcription failed" or API errors**
- Verify your internet connection is stable
- Check that your OpenAI API key has sufficient credits
- Try reducing the segment duration if uploads are timing out
- Check the browser console for detailed error messages

### Performance Tips

- **Microphone Quality**: Use a good quality microphone positioned 6-12 inches from your mouth
- **Speaking Style**: Speak clearly at a moderate pace with natural pauses
- **Environment**: Record in a quiet environment to improve voice detection accuracy
- **Settings Optimization**: 
  - Start with default settings (8s segments, 1s pause threshold)
  - Adjust pause threshold based on your speaking rhythm (faster speakers: 500ms, slower: 2000ms)
  - Set minimum segment duration to 3-5s to avoid processing very short utterances
- **API Efficiency**: The smart voice detection significantly reduces API costs by only processing segments with actual speech

## Privacy & Security

- **Audio Processing**: Audio is only sent to OpenAI's Whisper API for transcription
- **No Local Storage**: Audio segments are processed in memory and not stored on disk
- **Smart Filtering**: Voice detection prevents accidental recording of system audio or background noise
- **Secure API**: API key is stored locally in Obsidian settings, never transmitted to third parties
- **Local Transcripts**: All transcription results are stored locally in your Obsidian vault
- **No Tracking**: The plugin does not collect analytics or usage data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- 🐛 Report bugs in [GitHub Issues](https://github.com/Kazzx9921/obsidian-smart-transcriber/issues)
- 💡 Request features in [GitHub Discussions](https://github.com/Kazzx9921/obsidian-smart-transcriber/discussions)
- ☕ Support development: [Buy Me a Coffee](https://buymeacoffee.com/kazen)
- 📚 Check the documentation for detailed guides and troubleshooting

## Author

Created by **Kazen** - [Website](https://geekaz.net/)

---

Made with ❤️ for the Obsidian community. Smart Transcriber brings advanced voice recognition technology to your note-taking workflow.
