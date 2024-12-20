import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import { app, systemPreferences } from 'electron';

const execAsync = promisify(exec);

interface AudioDevice {
  id: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
}

interface CoreAudioRecorder {
  startRecording: (outputPath: string) => Promise<{ error?: string }>;
  stopRecording: () => Promise<{ error?: string }>;
  getAudioLevel: () => number;
  getCurrentRecordingPath: () => string;
}

export default class CoreAudioRecorder implements CoreAudioRecorder {
  private isRecording: boolean = false;
  private currentProcess: any = null;
  private lastLevel: number = 0;
  private monitorProcess: any = null;
  private currentRecordingPath: string = '';

  constructor() {
    this.isRecording = false;
  }

  async getSystemAudioDevices(): Promise<AudioDevice[]> {
    try {
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json');
      const data = JSON.parse(stdout);
      const devices: AudioDevice[] = [];

      // Parse system_profiler output to get audio devices
      if (data.SPAudioDataType) {
        data.SPAudioDataType.forEach((item: any) => {
          if (item['_items']) {
            item['_items'].forEach((device: any) => {
              devices.push({
                id: device['coreaudio_device_id'] || '',
                name: device['_name'] || '',
                isInput: device['coreaudio_input'] || false,
                isOutput: device['coreaudio_output'] || false,
              });
            });
          }
        });
      }

      return devices;
    } catch (error) {
      console.error('Error getting audio devices:', error);
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
          error: 'Sox is not installed. Please run yarn install to install required dependencies.',
        };
      }

      // Start recording using sox
      const command = `sox -d -t mp3 -c 2 -r 44100 "${outputPath}"`;
      this.currentProcess = exec(command);
      this.isRecording = true;

      // Start monitoring audio levels using sox with a different approach
      this.monitorProcess = spawn('sox', [
        '-d',                   // Use default input device
        '-t', 'wav',           // Output format
        '-',                   // Output to stdout
        'vol', '1',           // Keep original volume
        'rate', '44100',      // Sample rate
        'channels', '1',      // Mono for simpler processing
        'stat',               // Stats effect
        '-n',                 // No output file
        'stats',              // Print statistics
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      let buffer = '';
      this.monitorProcess.stderr.on('data', (data: Buffer) => {
        buffer += data.toString();
        if (buffer.includes('\n')) {
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.includes('Maximum amplitude:')) {
              const match = line.match(/Maximum amplitude:\s+([\d.]+)/);
              if (match) {
                const amplitude = parseFloat(match[1]);
                // Convert amplitude to a 0-1 scale
                this.lastLevel = Math.min(1, amplitude);
                console.log('Audio level:', this.lastLevel);
              }
            }
          }
        }
      });

      // Handle potential errors
      this.currentProcess.stderr?.on('data', (data: string) => {
        console.error('Recording error:', data);
      });

      this.currentRecordingPath = outputPath;
      return { error: undefined };
    } catch (error) {
      console.error('Error starting recording:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
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
      console.error('Error stopping recording:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  getAudioLevel(): number {
    if (!this.isRecording) {
      return 0;
    }
    return this.lastLevel;
  }

  getCurrentRecordingPath(): string {
    return this.currentRecordingPath;
  }
}
