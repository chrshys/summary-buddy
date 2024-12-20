import OpenAI from 'openai';
import fs from 'fs';

class TranscriptionService {
  private openai: OpenAI;

  private readonly TRANSCRIPTION_PROMPT =
    'You must respond with exactly "[NO_SPEECH]" (without quotes) if the audio contains no clear human speech, background noise, unclear speech, or if you are unsure. Do not attempt any transcription unless you detect clear, intelligible human speech.';

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async transcribeAudio(
    audioFilePath: string,
  ): Promise<{ text: string; error?: string }> {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        prompt: this.TRANSCRIPTION_PROMPT,
        language: 'en',
        response_format: 'text',
        temperature: 0,
      });

      if (response === '[NO_SPEECH]') {
        return {
          text: '',
          error: 'No clear human speech detected in the audio',
        };
      }

      return { text: response };
    } catch (error) {
      return {
        text: '',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown transcription error',
      };
    }
  }
}

export default TranscriptionService;
