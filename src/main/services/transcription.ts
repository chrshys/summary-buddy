import OpenAI from 'openai';
import fs from 'fs';

class TranscriptionService {
  private openai: OpenAI;

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
      });

      return { text: response.text };
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
