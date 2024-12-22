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
const BASE_AMPLITUDE = 10;
const WAVE_FREQUENCY = 6;
const CONTAINER_HEIGHT = 40;
const WAVE_PADDING = 4;
const MIN_BORDER_OPACITY = 0.5;
const MAX_BORDER_OPACITY = 1;
const BASE_SPEED = 10; // Base animation speed
const MAX_SPEED = 20; // Maximum animation speed when audio is loud

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

  const wavePaths = useMemo(() => {
    const boostedAudio = Math.min(1, audioLevel * 2);
    console.log('Audio Level:', audioLevel, 'Boosted:', boostedAudio);
    const amplitude = BASE_AMPLITUDE * (0.15 + boostedAudio * 0.85);
    const now = performance.now() / 1000;

    // Calculate animation speed based on audio level
    const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * boostedAudio;

    return [
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude,
          WAVE_FREQUENCY,
          now * speed, // Dynamic speed
        ),
        opacity: 0.7,
        id: 'primary-wave',
      },
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude * 0.8,
          WAVE_FREQUENCY * 1.5,
          now * speed * 1.2, // Slightly faster
        ),
        opacity: 0.5,
        id: 'secondary-wave',
      },
      {
        path: generateWavePath(
          300,
          CONTAINER_HEIGHT - WAVE_PADDING * 2,
          amplitude * 0.6,
          WAVE_FREQUENCY * 0.8,
          now * speed * 0.8, // Slightly slower
        ),
        opacity: 0.3,
        id: 'tertiary-wave',
      },
    ];
  }, [audioLevel]);

  const borderOpacity = useMemo(() => {
    const boostedAudio = Math.min(1, audioLevel * 2);
    return (
      MIN_BORDER_OPACITY +
      (MAX_BORDER_OPACITY - MIN_BORDER_OPACITY) * boostedAudio
    );
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
        className={`p-3 rounded-lg border transition-colors duration-[50ms] ${
          effectiveTheme === 'dark'
            ? 'bg-app-dark-surface/40'
            : 'bg-app-light-surface'
        }`}
        style={{
          borderColor: `rgb(239 68 68 / ${borderOpacity})`,
        }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onStopRecording}
            className={`p-3 rounded-full transition-colors ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface hover:bg-app-dark-border'
                : 'bg-app-light-surface hover:bg-app-light-border'
            }`}
            aria-label="Stop Recording"
          >
            <Square size={20} className="text-red-500" />
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
                      stroke="rgb(239, 68, 68)"
                      strokeWidth="2"
                      opacity={wave.opacity}
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
