# Speech-to-Text Converter using Deepgram and n8n

This application converts voice/audio files to text using Deepgram's AI-powered speech recognition API and n8n for workflow automation.

## Features
- High-accuracy speech recognition with Deepgram
- Workflow automation with n8n
- Support for various audio file formats
- Easy to use API

## Requirements
- Python 3.8+
- Deepgram API key
- n8n installed for workflow automation

## Setup
1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
2. Set up your Deepgram API key as an environment variable:
   ```
   set DEEPGRAM_API_KEY=your_api_key
   ```
3. Set up n8n according to the instructions in the video tutorial

## Usage
```
python transcribe.py --input your_audio_file.mp3
```

## n8n Integration
This project can be integrated with n8n for automated workflows. See the n8n_workflow.json file for an example workflow setup.
