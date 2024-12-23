import { Readable } from 'node:stream';

declare module 'node-audiorecorder' {
  interface AudioRecorderOptions {
    program?: string;
    device?: string | null;
    bits?: number;
    channels?: number;
    encoding?: string;
    rate?: number;
    type?: string;
    silence?: number;
  }

  class AudioRecorder {
    constructor(options?: AudioRecorderOptions);

    start(): AudioRecorder;

    stop(): void;

    stream(): Readable;
  }

  export default AudioRecorder;
}
