# OB Whispering - Installation Guide

Real-time voice transcription plugin for Obsidian using OpenAI Whisper API.

## Installation

1. **Download the plugin files**:
   - `main.js` - The compiled plugin code
   - `manifest.json` - Plugin metadata
   - `versions.json` - Version compatibility info

2. **Install in Obsidian**:
   - Navigate to your Obsidian vault folder
   - Go to `.obsidian/plugins/` (create if it doesn't exist)
   - Create a new folder named `Whispering`
   - Copy all the plugin files into this folder
   - The final structure should be:
     ```
     <your-vault>/.obsidian/plugins/Whispering/
     ├── main.js
     ├── manifest.json
     └── versions.json
     ```

3. **Enable the plugin**:
   - Open Obsidian
   - Go to Settings > Community plugins
   - Turn off Safe mode (if enabled)
   - Find "OB Whispering" in the installed plugins list
   - Toggle it on

## Configuration

1. **Get OpenAI API Key**:
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Make sure you have credits available

2. **Configure the plugin**:
   - Click the microphone icon in the sidebar or ribbon
   - Click the settings gear icon (⚙️)
   - Enter your OpenAI API key
   - Adjust other settings as needed

## Usage

1. **Start Recording**:
   - Open the Voice Transcriber panel
   - Click the record button
   - Grant microphone permissions when prompted

2. **View Transcripts**:
   - Speak into your microphone
   - Watch real-time transcription appear
   - Use "Copy All" to copy the full transcript
   - Use "Clear" to reset the transcript

## Features

- 🎤 Real-time voice recording with visual feedback
- 🤖 AI-powered transcription using OpenAI Whisper
- 📝 Live transcript updates in sidebar
- ✏️ Copy and clear transcript functionality
- 🌍 Multi-language support with auto-detection
- ⚙️ Configurable segment duration and settings

## Troubleshooting

- **"OpenAI API key is required"**: Enter a valid API key in settings
- **"Permission denied"**: Grant microphone access in your browser
- **"Transcription failed"**: Check internet connection and API credits

## Support

For issues or questions, please check the plugin documentation or contact support.

---

**Version**: 1.0.0  
**Minimum Obsidian Version**: 0.15.0
