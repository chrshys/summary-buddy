import { AssemblyAI } from 'assemblyai';
import fs from 'fs';

export interface DiarizedSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  segments: DiarizedSegment[];
  error?: string;
}

export interface SummaryResult {
  summary?: string;
  error?: string;
}

export interface ActionItemsResult {
  actionItems?: string;
  error?: string;
}

class DiarizationService {
  private client: AssemblyAI;

  private transcriptIds: Map<string, string> = new Map();

  constructor(apiKey: string) {
    this.client = new AssemblyAI({
      apiKey,
    });
  }

  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    try {
      // Create a readable stream from the audio file
      const audioStream = fs.createReadStream(audioFilePath);

      // Upload the file first
      const uploadUrl = await this.client.files.upload(audioStream);

      // Create a transcript with speaker diarization
      const transcript = await this.client.transcripts.create({
        audio_url: uploadUrl,
        speaker_labels: true,
        auto_chapters: true, // This helps with better segmentation
      });

      // Poll for completion
      const pollInterval = 5000; // 5 seconds
      const maxAttempts = 60; // 5 minutes maximum wait time
      let attempts = 0;

      const checkStatus = async (): Promise<TranscriptionResult> => {
        const result = await this.client.transcripts.get(transcript.id);

        if (result.status === 'error') {
          return {
            segments: [],
            error: `Transcription failed: ${result.error || 'Unknown error'}`,
          };
        }

        if (result.status === 'completed') {
          // Store the transcript ID for later use
          this.transcriptIds.set(audioFilePath, transcript.id);

          // Transform the result into our expected format
          const segments =
            result.utterances?.map((utterance) => ({
              speaker: utterance.speaker,
              text: utterance.text,
              start: utterance.start,
              end: utterance.end,
              confidence: utterance.confidence || 0,
            })) || [];

          return { segments };
        }

        if (attempts >= maxAttempts) {
          return {
            segments: [],
            error: 'Transcription timed out after 5 minutes',
          };
        }

        attempts += 1;
        await new Promise((resolve) => {
          setTimeout(resolve, pollInterval);
        });
        return checkStatus();
      };

      return checkStatus();
    } catch (error) {
      return {
        segments: [],
        error:
          error instanceof Error
            ? error.message
            : 'Unknown transcription error',
      };
    }
  }

  async createSummary(audioFilePath: string): Promise<SummaryResult> {
    try {
      // Get the transcript ID if it exists
      let transcriptId = this.transcriptIds.get(audioFilePath);

      // If no transcript ID exists, create a new transcription
      if (!transcriptId) {
        const transcriptionResult = await this.transcribeAudio(audioFilePath);
        if (transcriptionResult.error) {
          return { error: transcriptionResult.error };
        }
        transcriptId = this.transcriptIds.get(audioFilePath);
      }

      if (!transcriptId) {
        return { error: 'Failed to get transcript ID' };
      }

      // Use LeMUR to generate the summary
      const summary = await this.client.lemur.task({
        prompt: 'Please provide a concise summary of the key points discussed.',
        transcript_ids: [transcriptId],
      });

      return { summary: summary.response };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown summarization error',
      };
    }
  }

  async createActionItems(audioFilePath: string): Promise<ActionItemsResult> {
    try {
      // Get the transcript ID if it exists
      let transcriptId = this.transcriptIds.get(audioFilePath);

      // If no transcript ID exists, create a new transcription
      if (!transcriptId) {
        const transcriptionResult = await this.transcribeAudio(audioFilePath);
        if (transcriptionResult.error) {
          return { error: transcriptionResult.error };
        }
        transcriptId = this.transcriptIds.get(audioFilePath);
      }

      if (!transcriptId) {
        return { error: 'Failed to get transcript ID' };
      }

      // Use LeMUR to generate action items
      const result = await this.client.lemur.task({
        prompt:
          'Extract all action items, tasks, and commitments from the conversation. Format them as a list with speaker labels. For each action item, start with the speaker label (e.g., [A], [B]) followed by their action. For example:\n[A] will schedule the meeting\n[A] will send the agenda\n[B] will prepare the presentation',
        transcript_ids: [transcriptId],
      });

      return { actionItems: result.response };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error generating action items',
      };
    }
  }
}

export default DiarizationService;
