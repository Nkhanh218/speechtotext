from flask import Flask, request, jsonify
import os
import tempfile
import requests
import json
from transcribe import transcribe_audio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

@app.route('/transcribe', methods=['POST'])
def transcribe_endpoint():
    """
    Webhook endpoint for n8n to trigger audio transcription
    
    Expected JSON payload:
    {
        "audio_url": "https://example.com/audio.mp3",
        "callback_url": "https://n8n.your-domain.com/webhook/123" (optional)
    }
    """
    try:
        data = request.json
        
        if not data or 'audio_url' not in data:
            return jsonify({"error": "Missing audio_url in request"}), 400
        
        audio_url = data['audio_url']
        callback_url = data.get('callback_url')
        
        # Download the audio file
        response = requests.get(audio_url)
        if response.status_code != 200:
            return jsonify({"error": f"Failed to download audio from {audio_url}"}), 400
        
        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_file.write(response.content)
            temp_path = temp_file.name
        
        # Transcribe the audio
        try:
            transcript = transcribe_audio(temp_path)
            
            # Extract the text from the transcript
            results = transcript.results
            transcript_text = results.channels[0].alternatives[0].transcript
            
            # Prepare response data
            response_data = {
                "success": True,
                "transcript": transcript_text,
                "full_response": transcript
            }
            
            # Send to callback URL if provided
            if callback_url:
                try:
                    requests.post(
                        callback_url, 
                        json=response_data,
                        headers={"Content-Type": "application/json"}
                    )
                except Exception as e:
                    print(f"Error sending to callback URL: {e}")
            
            # Clean up the temporary file
            os.unlink(temp_path)
            
            return jsonify(response_data), 200
            
        except Exception as e:
            # Clean up the temporary file
            os.unlink(temp_path)
            return jsonify({"error": f"Transcription error: {str(e)}"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
