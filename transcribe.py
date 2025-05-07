#!/usr/bin/env python3
import os
import argparse
import json
from pathlib import Path
from deepgram import DeepgramClient, PrerecordedOptions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Deepgram API key
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
if not DEEPGRAM_API_KEY:
    raise ValueError("Please set the DEEPGRAM_API_KEY environment variable")

def transcribe_audio(file_path):
    """
    Transcribe an audio file using Deepgram API
    
    Args:
        file_path (str): Path to the audio file
    
    Returns:
        dict: The transcription results
    """
    # Initialize the Deepgram client
    deepgram = DeepgramClient(DEEPGRAM_API_KEY)
    
    # Check if file exists
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"The file {file_path} does not exist")
    
    # Set up options for transcription
    options = PrerecordedOptions(
        model="nova-2",
        smart_format=True,
        utterances=True,
        punctuate=True,
    )
    
    # Open the audio file
    with open(path, "rb") as audio:
        # Send the audio to Deepgram for transcription
        response = deepgram.listen.prerecorded.v("1").transcribe_file(audio, options)
        
        # Return the response
        return response

def save_transcript(transcript, output_file=None):
    """
    Save transcript to a file or print to console
    
    Args:
        transcript (dict): The transcript response from Deepgram
        output_file (str, optional): Path to save the transcript. Defaults to None.
    """
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(transcript, f, indent=2)
        print(f"Transcript saved to {output_file}")
    else:
        # Extract and print the transcript text
        try:
            results = transcript.results
            transcript_text = results.channels[0].alternatives[0].transcript
            print("\nTranscript:")
            print(transcript_text)
        except Exception as e:
            print(f"Error extracting transcript: {e}")
            print("Full response:")
            print(json.dumps(transcript, indent=2))

def main():
    parser = argparse.ArgumentParser(description="Transcribe audio files using Deepgram API")
    parser.add_argument("--input", "-i", required=True, help="Path to the audio file")
    parser.add_argument("--output", "-o", help="Path to save the transcript (optional)")
    args = parser.parse_args()
    
    try:
        # Transcribe the audio file
        transcript = transcribe_audio(args.input)
        
        # Save or print the transcript
        save_transcript(transcript, args.output)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
