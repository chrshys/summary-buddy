import { useMemo } from 'react';
import { Square } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RecordingVisualizerProps {
  audioLevel: number;
  elapsedTime: number;
  onStopRecording: () => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Wave generation constants
const WAVE_POINTS = 100;
const BASE_AMPLITUDE = 8; // Reduced from 10 for subtler waves
const WAVE_FREQUENCY = 4; // Reduced from 6 for smoother waves
const CONTAINER_HEIGHT = 40;
const WAVE_PADDING = 4;
const BASE_SPEED = 15; // Reduced for smoother animation
const MAX_SPEED = 25; // Reduced for smoother maximum speed

const generateWavePath = (
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
): string => {
  let path = `M 0 ${height / 2}`;
  for (let i = 0; i <= WAVE_POINTS; i += 1) {
    const x = (i / WAVE_POINTS) * width;
    const y =
      height / 2 +
      Math.sin((i / WAVE_POINTS) * Math.PI * 2 * frequency + phase) * amplitude;
    path += ` L ${x} ${y}`;
  }
  return path;
};

export default function RecordingVisualizer({
  audioLevel,
  elapsedTime,
  onStopRecording,
}: RecordingVisualizerProps) {
  const { effectiveTheme } = useTheme();

  // Get the appropriate stroke color based on theme
  const getStrokeColor = (opacity: number) => {
    if (effectiveTheme === 'dark') {
      // Dark theme: blue tint
      return `rgba(136, 192, 208, ${opacity})`;
    }
    // Light theme: subtle blue
    return `rgba(76, 86, 106, ${opacity})`;
  };

  const wavePaths = useMemo(() => {
    const boostedAudio = Math.min(1, audioLevel * 2);
    const amplitude = BASE_AMPLITUDE * (0.15 + boostedAudio * 0.85);
    const now = performance.now() / 1000;
    const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * boostedAudio;
    return [
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude,
          WAVE_FREQUENCY,
          now * speed,
        ),
        opacity: 0.5,
        id: 'primary-wave',
      },
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude * 0.8,
          WAVE_FREQUENCY * 1.5,
          now * speed * 1.2,
        ),
        opacity: 0.3,
        id: 'secondary-wave',
      },
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude * 0.6,
          WAVE_FREQUENCY * 0.8,
          now * speed * 0.8,
        ),
        opacity: 0.15,
        id: 'tertiary-wave',
      },
    ];
  }, [audioLevel]);

  return (
    <div
      className={`w-full ${
        effectiveTheme === 'dark'
          ? 'text-app-dark-text-primary'
          : 'text-app-light-text-primary'
      }`}
    >
      <div
        className={`p-3 rounded-lg border transition-colors duration-200 ${
          effectiveTheme === 'dark'
            ? 'bg-app-dark-surface/40 border-app-dark-border/50'
            : 'bg-app-light-surface border-app-light-border'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onStopRecording}
            className={`p-3 rounded-full transition-all duration-200 ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface hover:bg-app-dark-border hover:shadow-[0_0_10px_rgba(136,192,208,0.1)] hover:scale-105'
                : 'bg-app-light-surface hover:bg-app-light-border hover:shadow-md hover:scale-105'
            }`}
            aria-label="Stop Recording"
          >
            <Square
              size={20}
              className={`transition-colors duration-200 ${
                effectiveTheme === 'dark'
                  ? 'text-[#88C0D0] group-hover:text-[#88C0D0]/80'
                  : 'text-[#5E81AC] group-hover:text-[#5E81AC]/80'
              }`}
            />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-[40px] relative">
              <div className="absolute inset-0 flex items-center px-1">
                <svg
                  width="100%"
                  height={CONTAINER_HEIGHT - WAVE_PADDING * 2}
                  preserveAspectRatio="none"
                >
                  {wavePaths.map((wave) => (
                    <path
                      key={wave.id}
                      d={wave.path}
                      fill="none"
                      stroke={getStrokeColor(wave.opacity)}
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>
              </div>
            </div>
            <span
              className={`text-xs min-w-[40px] text-right ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
