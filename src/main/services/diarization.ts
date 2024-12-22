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
  transcript?: string;
  error?: string;
}

export interface SummaryResult {
  notes?: string;
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

          // Create verbatim transcript
          const verbatimTranscript = segments
            .map((segment) => `[${segment.speaker}]: ${segment.text}`)
            .join('\n\n');

          return {
            segments,
            transcript: verbatimTranscript,
          };
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

      // Generate combined notes with summary and action items
      const notesResult = await this.client.lemur.task({
        prompt: `Please provide comprehensive meeting notes that capture the key points and details of this conversation. Include:

1. OVERVIEW
- Brief context of the meeting
- Main purpose or objectives discussed

2. KEY DISCUSSION POINTS
- Important topics covered
- Major decisions made
- Significant insights or findings
- Include relevant details, examples, and context
- Preserve important quotes or specific numbers mentioned

3. CONCLUSIONS & NEXT STEPS
- Final decisions or agreements reached
- Any open questions or items requiring further discussion

4. ACTION ITEMS
List all action items, tasks, and commitments from the conversation:
- Include who is responsible
- Add any mentioned deadlines
- Note any dependencies

Format the response in a clear, well-structured manner using headings and bullet points. Be thorough but concise, and maintain the original context and nuance of the discussion.`,
        transcript_ids: [transcriptId],
      });

      return {
        notes: notesResult.response,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown summarization error',
      };
    }
  }
}

export default DiarizationService;
