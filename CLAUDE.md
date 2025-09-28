# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Transcriber is an Obsidian plugin for real-time voice transcription using OpenAI Whisper API. It features intelligent voice detection, smart timing segmentation, and displays live transcripts in the sidebar.

## Development Commands

```bash
# Development with hot reload
npm run dev

# Build for production (includes TypeScript check)
npm run build

# Create release package
npm run release

# Type checking only (with Svelte support)
npm run svelte-check

# Version bump and git staging
npm run version
```

## Architecture

The plugin follows a modular TypeScript + Svelte architecture:

- **Frontend**: Svelte 4 components with TypeScript
- **Audio Processing**: Web Audio API with MediaRecorder
- **Build System**: esbuild with Svelte plugin
- **API Integration**: OpenAI Whisper API

### Core Components

**Services Layer** (`src/services/`):
- `VoiceActivityDetector.ts` - Smart voice detection with human voice recognition
- `AudioRecorder.ts` - Audio capture and segment management
- `WhisperAPI.ts` - OpenAI API integration for transcription
- `SegmentManager.ts` - Audio segment processing and queuing
- `AudioSourceManager.ts` - Audio input source handling

**UI Components** (`src/components/`):
- `SimpleVoiceRecorder.svelte` - Main recording interface
- `VoiceTranscriberApp.svelte` - App container
- `TranscriptDisplay.svelte` - Transcript display and editing
- `SimpleSettingsPanel.svelte` - Settings configuration UI

**Obsidian Integration**:
- `main.ts` - Plugin entry point
- `src/views/SidebarView.ts` - Sidebar view implementation
- `src/settings/` - Plugin settings and configuration

### Key Features

**Smart Voice Detection**: Advanced voice activity detection distinguishes human speech from computer audio and background noise using confidence scoring and adaptive thresholds.

**Intelligent Timing**: Timer only counts when voice is actively detected. Segments are uploaded when voice pauses are detected, not on fixed intervals.

**Real-time Processing**: 50ms detection intervals provide responsive voice activity detection with sequential API requests and smart retry logic.

## Configuration

The plugin uses TypeScript configuration with Svelte support:
- `tsconfig.json` - TypeScript configuration with ES6 target
- `esbuild.config.mjs` - Build configuration with Svelte preprocessing
- `manifest.json` - Obsidian plugin metadata

## Build Process

1. TypeScript compilation with `tsc -noEmit -skipLibCheck`
2. Bundle with esbuild using Svelte plugin
3. CSS injection for Svelte components
4. Source maps in development mode

## API Integration

The plugin integrates with OpenAI Whisper API for transcription:
- Audio segments processed as multipart/form-data
- Smart queuing prevents API rate limiting
- Automatic retry logic for failed requests
- Local storage of API keys in Obsidian settings

## Testing

No formal test framework is configured. Manual testing through Obsidian development mode.