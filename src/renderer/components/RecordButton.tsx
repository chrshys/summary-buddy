import React from 'react';
import { Mic } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RecordButtonProps {
  isRecording: boolean;
  audioLevel: number;
  elapsedTime: number;
  onToggleRecording: () => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getButtonBackgroundClass = (
  isRecording: boolean,
  theme: 'light' | 'dark',
): string => {
  if (isRecording) {
    return 'bg-red-500 hover:bg-red-600';
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
}: RecordButtonProps) {
  const { effectiveTheme } = useTheme();

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onToggleRecording}
        className={`p-4 rounded-full transition-all relative ${getButtonBackgroundClass(
          isRecording,
          effectiveTheme,
        )}`}
        aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        style={{
          transform: isRecording
            ? `scale(${1 + audioLevel * 0.15})`
            : 'scale(1)',
          transition: 'transform 0.05s ease-out',
        }}
      >
        <Mic
          size={24}
          className={
            effectiveTheme === 'dark'
              ? 'text-app-dark-text-primary'
              : 'text-app-light-text-primary'
          }
        />
        {isRecording && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-red-500/50 blur-[12px]"
              style={{
                opacity: 0.3 + audioLevel * 0.7,
                transform: `scale(${1.2 + audioLevel * 0.3})`,
                transition: 'all 0.05s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/80"
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
                opacity: Math.max(0, 0.8 - audioLevel * 0.5),
                transition: 'all 0.05s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/60"
              style={{
                transform: `scale(${1 + audioLevel * 0.8})`,
                opacity: Math.max(0, 0.6 - audioLevel * 0.4),
                transition: 'all 0.075s ease-out',
              }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/40"
              style={{
                transform: `scale(${1 + audioLevel})`,
                opacity: Math.max(0, 0.4 - audioLevel * 0.3),
                transition: 'all 0.1s ease-out',
              }}
            />
            {audioLevel > 0.2 && (
              <div
                className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
                style={{
                  animationDuration: `${1 - audioLevel * 0.5}s`,
                  opacity: Math.min(1, audioLevel * 2),
                }}
              />
            )}
          </>
        )}
      </button>

      <p
        className={`mt-4 text-sm ${
          effectiveTheme === 'dark'
            ? 'text-app-dark-text-secondary'
            : 'text-app-light-text-secondary'
        }`}
      >
        {isRecording ? `Recording... ${formatTime(elapsedTime)}` : 'Record'}
      </p>
    </div>
  );
}
