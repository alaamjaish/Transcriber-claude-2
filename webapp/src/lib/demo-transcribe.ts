/**
 * Transcribe audio for demo recordings
 *
 * This uses OpenAI's Whisper API for simplicity with file-based transcription.
 * Alternative: Could use Soniox's REST API or other transcription services.
 */

export async function transcribeAudioDemo(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Create FormData for Whisper API
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en'); // Can be removed to auto-detect
  formData.append('response_format', 'text');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
    }

    const transcript = await response.text();
    return transcript.trim();
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio. Please try again.');
  }
}
