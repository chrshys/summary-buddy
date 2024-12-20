import path from 'path';
import fsPromises from 'fs/promises';
import { existsSync } from 'fs';

export interface RecordingMetadata {
  path: string;
  startTime: number;
  duration: number;
}

export class RecordingMetadataStore {
  private static recordingStartTimes = new Map<string, number>();

  static startRecording(recordingPath: string): void {
    this.recordingStartTimes.set(recordingPath, Date.now());
  }

  static getStartTime(recordingPath: string): number {
    return this.recordingStartTimes.get(recordingPath) || Date.now();
  }

  static async getMetadata(recordingPath: string) {
    try {
      const folderPath = path.dirname(recordingPath);
      const metadataPath = path.join(folderPath, 'metadata.json');

      if (!existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(
        await fsPromises.readFile(metadataPath, 'utf8'),
      );
      return metadata;
    } catch (error) {
      console.error('Error reading recording metadata:', error);
      return null;
    }
  }

  static async updateMetadata(
    recordingPath: string,
    updates: Partial<{
      title: string;
      duration: number;
      transcriptionId?: string;
      lastModified: string;
    }>,
  ) {
    try {
      const folderPath = path.dirname(recordingPath);
      const metadataPath = path.join(folderPath, 'metadata.json');
      let metadata = {};

      // Try to read existing metadata
      if (existsSync(metadataPath)) {
        metadata = JSON.parse(
          await fsPromises.readFile(metadataPath, 'utf8'),
        );
      }

      // Update metadata with new values
      metadata = {
        ...metadata,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      await fsPromises.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
      );
      return true;
    } catch (error) {
      console.error('Error updating recording metadata:', error);
      return false;
    }
  }
}
