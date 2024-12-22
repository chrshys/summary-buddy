import React from 'react';
import { Mic, Play } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RecordButtonProps {
  isRecording: boolean;
  audioLevel: number;
  elapsedTime: number;
  onToggleRecording: () => void;
  isPlayButton?: boolean;
  duration?: number;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getButtonBackgroundClass = (
  isRecording: boolean,
  isPlayButton: boolean,
  theme: 'light' | 'dark',
): string => {
  if (isRecording) {
    return 'bg-red-500 hover:bg-red-600';
  }
  if (isPlayButton) {
    return theme === 'dark'
      ? 'bg-app-dark-surface hover:bg-app-dark-border'
      : 'bg-app-light-surface hover:bg-app-light-border';
  }
  return theme === 'dark'
    ? 'bg-app-dark-surface/50 hover:bg-app-dark-surface'
    : 'bg-app-light-surface hover:bg-app-light-border';
};

export default function RecordButton({
  isRecording,
  audioLevel,
  elapsedTime,
  onToggleRecording,
  isPlayButton = false,
  duration = 0,
}: RecordButtonProps) {
  const { effectiveTheme } = useTheme();

  const getAriaLabel = () => {
    if (isRecording) {
      return 'Stop Recording';
    }
    if (isPlayButton) {
      return 'Play Recording';
    }
    return 'Start Recording';
  };

  const getButtonText = () => {
    if (isRecording) {
      return formatTime(elapsedTime);
    }
    if (isPlayButton) {
      return formatTime(duration);
    }
    return 'Record';
  };

  const textColorClass =
    effectiveTheme === 'dark'
      ? 'text-app-dark-text-secondary'
      : 'text-app-light-text-secondary';

  const iconColorClass =
    effectiveTheme === 'dark'
      ? 'text-app-dark-text-primary'
      : 'text-app-light-text-primary';

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onToggleRecording}
        className={`p-5 rounded-full transition-all relative ${getButtonBackgroundClass(
          isRecording,
          isPlayButton,
          effectiveTheme,
        )}`}
        aria-label={getAriaLabel()}
        style={{
          transform: isRecording
            ? `scale(${1 + audioLevel * 0.25})`
            : 'scale(1)',
          transition: 'transform 0.03s ease-out',
        }}
      >
        {isPlayButton && !isRecording ? (
          <Play size={30} className={iconColorClass} />
        ) : (
          <Mic size={30} className={iconColorClass} />
        )}
        {isRecording && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-red-500/50 blur-[12px]"
              style={{
                opacity: 0.2 + audioLevel * 0.8,
                transform: `scale(${1.2 + audioLevel * 0.4})`,
                transition: 'all 0.03s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/80"
              style={{
                transform: `scale(${1 + audioLevel * 0.6})`,
                opacity: Math.max(0, 0.8 - audioLevel * 0.6),
                transition: 'all 0.03s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/60"
              style={{
                transform: `scale(${1 + audioLevel * 0.9})`,
                opacity: Math.max(0, 0.6 - audioLevel * 0.5),
                transition: 'all 0.04s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/40"
              style={{
                transform: `scale(${1 + audioLevel * 1.2})`,
                opacity: Math.max(0, 0.4 - audioLevel * 0.3),
                transition: 'all 0.05s ease-out',
              }}
            />
            {audioLevel > 0.1 && (
              <div
                className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
                style={{
                  animationDuration: `${0.8 - audioLevel * 0.6}s`,
                  opacity: Math.min(1, audioLevel * 2.5),
                }}
              />
            )}
          </>
        )}
      </button>
      <p className={`mt-4 text-sm ${textColorClass}`}>{getButtonText()}</p>
    </div>
  );
}
