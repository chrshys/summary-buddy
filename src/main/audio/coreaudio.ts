/// <reference types="node" />

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

export default class CoreAudioRecorder implements IAudioRecorder {
  private isRecording: boolean = false;

  private currentProcess: any = null;

  private lastLevel: number = 0;

  private monitorProcess: any = null;

  private currentRecordingPath: string = '';

  private cleanup: (() => void) | null = null;

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

  private startMonitoring(): void {
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
        '--buffer',
        '32000', // Smaller buffer for lower latency
        '-', // Output to stdout
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, AUDIODEV: 'default' },
      },
    );

    // Smaller buffer size for more frequent updates
    const BUFFER_SIZE = 2205; // 0.05 seconds of audio at 44.1kHz
    let audioBuffer = Buffer.alloc(0);
    let lastUpdate = Date.now();
    let hasReceivedData = false;

    // Handle process errors
    this.monitorProcess.on('error', () => {
      if (this.isRecording) {
        this.restartMonitoring();
      }
    });

    // Handle process exit
    this.monitorProcess.on('exit', () => {
      if (this.isRecording) {
        this.restartMonitoring();
      }
    });

    // Handle stdout errors
    this.monitorProcess.stdout.on('error', () => {
      if (this.isRecording) {
        this.restartMonitoring();
      }
    });

    // Add watchdog timer
    const watchdog = setInterval(() => {
      const now = Date.now();
      if (hasReceivedData && now - lastUpdate > 1000) {
        // No updates for 1 second
        this.restartMonitoring();
        clearInterval(watchdog);
      }
    }, 1000);

    // Process audio data
    this.monitorProcess.stdout.on('data', (data: Buffer) => {
      try {
        hasReceivedData = true;
        const startOffset = audioBuffer.length === 0 ? 44 : 0;
        audioBuffer = Buffer.concat([audioBuffer, data.slice(startOffset)]);

        while (audioBuffer.length >= BUFFER_SIZE * 2) {
          const samples = new Int16Array(
            audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + BUFFER_SIZE * 2,
            ),
          );

          let sum = 0;
          // Process fewer samples for faster response
          const stride = 2; // Skip every other sample
          for (let i = 0; i < samples.length; i += stride) {
            const normalized = samples[i] / 32768.0;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / (samples.length / stride));

          const now = Date.now();
          if (now - lastUpdate >= 8) {
            // Update at ~120fps

            const normalizedLevel = Math.min(1, rms * 8);
            console.log('RMS:', rms, 'Normalized:', normalizedLevel);
            this.lastLevel =
              normalizedLevel > this.lastLevel
                ? this.lastLevel * 0.3 + normalizedLevel * 0.7
                : this.lastLevel * 0.4 + normalizedLevel * 0.6;
            console.log('Final Level:', this.lastLevel);
            lastUpdate = now;
          }

          audioBuffer = audioBuffer.slice(BUFFER_SIZE * 2);
        }

        // Keep buffer small
        if (audioBuffer.length > BUFFER_SIZE * 4) {
          audioBuffer = audioBuffer.slice(-BUFFER_SIZE * 4);
        }
      } catch (error) {
        audioBuffer = Buffer.alloc(0);
      }
    });

    // Remove the return statement since we've declared void return type
    const cleanup = () => {
      clearInterval(watchdog);
      if (this.monitorProcess) {
        this.monitorProcess.kill('SIGINT');
      }
    };

    // Store cleanup function for later use if needed
    this.cleanup = cleanup;
  }

  private restartMonitoring() {
    if (this.monitorProcess) {
      this.monitorProcess.kill('SIGINT');
      this.monitorProcess = null;
    }
    setTimeout(() => {
      if (this.isRecording) {
        this.startMonitoring();
      }
    }, 100);
  }

  async stopRecording(): Promise<{ error?: string }> {
    if (!this.isRecording) {
      return { error: 'Not recording' };
    }

    try {
      if (this.cleanup) {
        this.cleanup();
        this.cleanup = null;
      }
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
