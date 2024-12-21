import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface AudioDevice {
  id: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
}

interface IAudioRecorder {
  startRecording: (outputPath: string) => Promise<{ error?: string }>;
  stopRecording: () => Promise<{ error?: string }>;
  getAudioLevel: () => number;
  getCurrentRecordingPath: () => string;
}

interface SystemProfilerDevice {
  coreaudio_device_id?: string;
  coreaudio_input?: boolean;
  coreaudio_output?: boolean;
  name?: string;
}

interface SystemProfilerAudioType {
  items?: SystemProfilerDevice[];
}

class CoreAudioRecorder implements IAudioRecorder {
  private isRecording: boolean = false;

  private currentProcess: any = null;

  private lastLevel: number = 0;

  private monitorProcess: any = null;

  private currentRecordingPath: string = '';

  constructor() {
    this.isRecording = false;
  }

  static async getSystemAudioDevices(): Promise<AudioDevice[]> {
    try {
      const { stdout } = await execAsync(
        'system_profiler SPAudioDataType -json',
      );
      const data = JSON.parse(stdout);
      const devices: AudioDevice[] = [];

      // Parse system_profiler output to get audio devices
      if (data.SPAudioDataType) {
        data.SPAudioDataType.forEach((item: SystemProfilerAudioType) => {
          if (item.items) {
            item.items.forEach((device: SystemProfilerDevice) => {
              devices.push({
                id: device.coreaudio_device_id || '',
                name: device.name || '',
                isInput: device.coreaudio_input || false,
                isOutput: device.coreaudio_output || false,
              });
            });
          }
        });
      }

      return devices;
    } catch (error) {
      return [];
    }
  }

  async startRecording(outputPath: string): Promise<{ error?: string }> {
    if (this.isRecording) {
      return { error: 'Already recording' };
    }

    try {
      // Check if sox is installed
      try {
        await execAsync('which sox');
      } catch (error) {
        return {
          error:
            'Sox is not installed. Please run yarn install to install required dependencies.',
        };
      }

      // Set recording state first
      this.isRecording = true;
      this.currentRecordingPath = outputPath;

      // Start monitoring before starting the recording
      this.startMonitoring();

      // Start recording using sox with different encoding parameters
      const command = `sox -d -t mp3 -C 192 -b 16 "${outputPath}"`;
      this.currentProcess = exec(command, { maxBuffer: 1024 * 1024 * 100 });

      // Monitor file size and handle potential issues
      const sizeCheckInterval = setInterval(async () => {
        try {
          const stats = await fs.promises.stat(outputPath);
          const sizeMB = stats.size / (1024 * 1024);

          // If we're approaching the problematic size, start a new segment
          if (sizeMB > 25) {
            const currentPath = this.currentRecordingPath;
            const basePath = currentPath.replace(/\.mp3$/, '');
            const timestamp = Date.now();
            const newPath = `${basePath}_${timestamp}.mp3`;

            // Start new recording before stopping old one to avoid gaps
            const newRecorder = new CoreAudioRecorder();
            await newRecorder.startRecording(newPath);

            // Stop the current recording after small delay to ensure overlap
            setTimeout(() => {
              this.stopRecording();
              this.currentProcess = newRecorder.currentProcess;
              this.monitorProcess = newRecorder.monitorProcess;
              this.currentRecordingPath = newPath;
            }, 500);
          }
        } catch (error) {
          /* empty */
        }
      }, 1000);

      this.currentProcess.on('exit', (code: number) => {
        clearInterval(sizeCheckInterval);
        if (code !== 0 && this.isRecording) {
          const newPath = this.currentRecordingPath.replace(
            /\.mp3$/,
            '_recovered.mp3',
          );
          this.startRecording(newPath);
        }
      });

      return { error: undefined };
    } catch (error) {
      this.isRecording = false;
      return {
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private startMonitoring() {
    if (!this.isRecording) return;

    // Create a continuous monitoring process that outputs raw audio data
    this.monitorProcess = spawn(
      'sox',
      [
        '-d', // Input from default audio device
        '-t',
        'wav', // WAV format
        '-r',
        '44100', // Sample rate
        '-c',
        '1', // Mono
        '-b',
        '16', // 16-bit depth
        '-', // Output to stdout
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    // Buffer to store audio samples
    const BUFFER_SIZE = 4410; // 0.1 seconds of audio at 44.1kHz
    let audioBuffer = Buffer.alloc(0);
    let lastUpdate = Date.now();

    this.monitorProcess.stdout.on('data', (data: Buffer) => {
      // Skip the WAV header (44 bytes) if present
      const startOffset = audioBuffer.length === 0 ? 44 : 0;

      // Append new data to our buffer
      audioBuffer = Buffer.concat([audioBuffer, data.slice(startOffset)]);

      // Process the buffer when we have enough samples
      while (audioBuffer.length >= BUFFER_SIZE * 2) {
        // Convert buffer to 16-bit samples
        const samples = new Int16Array(audioBuffer.buffer, 0, BUFFER_SIZE);

        // Calculate RMS of the samples
        let sum = 0;
        for (let index = 0; index < samples.length; index += 1) {
          sum += (samples[index] / 32768) ** 2; // Normalize to [-1, 1] and square
        }
        const rms = Math.sqrt(sum / samples.length);

        // Update the level with aggressive scaling for better visibility
        const normalizedLevel = Math.min(1, rms * 30);

        const now = Date.now();
        if (now - lastUpdate >= 16) {
          // Update at ~60fps
          this.lastLevel = this.lastLevel * 0.2 + normalizedLevel * 0.8;
          lastUpdate = now;
        }

        // Remove processed samples from buffer
        audioBuffer = audioBuffer.slice(BUFFER_SIZE * 2);
      }
    });

    this.monitorProcess.on('error', () => {
      if (this.isRecording) {
        setTimeout(() => this.startMonitoring(), 1000);
      }
    });

    this.monitorProcess.on('exit', () => {
      if (this.isRecording) {
        setTimeout(() => this.startMonitoring(), 100);
      }
    });
  }

  async stopRecording(): Promise<{ error?: string }> {
    if (!this.isRecording) {
      return { error: 'Not recording' };
    }

    try {
      if (this.currentProcess) {
        this.currentProcess.kill('SIGINT');
        this.currentProcess = null;
      }
      if (this.monitorProcess) {
        this.monitorProcess.kill('SIGINT');
        this.monitorProcess = null;
      }
      this.isRecording = false;
      this.lastLevel = 0;
      this.currentRecordingPath = '';
      return { error: undefined };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  getAudioLevel(): number {
    if (!this.isRecording) {
      return 0;
    }
    const level = Math.min(1, Math.max(0, this.lastLevel));
    return level > 0.005 ? level : 0;
  }

  getCurrentRecordingPath(): string {
    return this.currentRecordingPath;
  }
}

export default CoreAudioRecorder;
