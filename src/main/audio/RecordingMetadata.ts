export interface RecordingMetadata {
  path: string;
  startTime: number;
  duration: number;
}

export class RecordingMetadataStore {
  private static recordings = new Map<string, number>();

  static startRecording(path: string) {
    this.recordings.set(path, Date.now());
  }

  static getStartTime(path: string): number {
    return this.recordings.get(path) || Date.now();
  }

  static stopRecording(path: string): number {
    const startTime = this.getStartTime(path);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    this.recordings.delete(path);
    return duration;
  }

  static getDuration(path: string): number {
    const startTime = this.recordings.get(path);
    if (startTime) {
      return Math.floor((Date.now() - startTime) / 1000);
    }
    return 0;
  }
}
