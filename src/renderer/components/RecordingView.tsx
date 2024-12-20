import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, FileText, Loader } from 'lucide-react';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';

interface RecordingViewProps {
  onPlay: (recording: Recording) => void;
  onTranscribe: (recording: Recording) => Promise<void>;
  recordings: Recording[];
  isTranscribing: Record<string, boolean>;
  transcriptions: Record<string, string>;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function RecordingView({
  onPlay,
  onTranscribe,
  recordings,
  isTranscribing,
  transcriptions,
}: RecordingViewProps) {
  const { recordingPath } = useParams<{ recordingPath: string }>();
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const [recording, setRecording] = useState<Recording | null>(null);

  useEffect(() => {
    if (recordingPath) {
      const decodedPath = decodeURIComponent(recordingPath);
      const foundRecording = recordings.find((r) => r.path === decodedPath);
      setRecording(foundRecording || null);
    }
  }, [recordingPath, recordings]);

  if (!recording) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Recording not found</h2>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 text-blue-500 hover:text-blue-600"
          >
            Go back to recordings
          </button>
        </div>
      </div>
    );
  }

  const date = recording.date ? new Date(recording.date) : null;
  const formattedDate = date
    ? date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Untitled Recording';

  const formattedTime = date
    ? date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  return (
    <div
      className={`h-screen flex flex-col ${
        effectiveTheme === 'dark'
          ? 'bg-app-dark-bg text-app-dark-text-primary'
          : 'bg-app-light-bg text-app-light-text-primary'
      }`}
    >
      <div
        className={`flex items-center px-3 py-2 border-b ${
          effectiveTheme === 'dark'
            ? 'bg-app-dark-surface/50 border-app-dark-border'
            : 'bg-app-light-surface/50 border-app-light-border'
        } window-drag`}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`p-1.5 mr-2 transition-colors rounded-md ${
            effectiveTheme === 'dark'
              ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface'
              : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
          }`}
        >
          <ArrowLeft size={16} />
        </button>
        <div
          className={
            effectiveTheme === 'dark'
              ? 'text-sm font-medium text-app-dark-text-secondary'
              : 'text-sm font-medium text-app-light-text-secondary'
          }
        >
          Recording Details
        </div>
      </div>

      <div className="flex-1 p-6 pb-12 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">{formattedDate}</h1>
            <p
              className={
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }
            >
              {formattedTime}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPlay(recording)}
              className={`p-2 transition-colors rounded-md ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface'
                  : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
              }`}
              aria-label="Play recording"
            >
              <Play size={20} />
            </button>
            <button
              type="button"
              onClick={() => onTranscribe(recording)}
              disabled={isTranscribing[recording.path]}
              className={`p-2 transition-colors rounded-md ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface'
                  : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
              } ${isTranscribing[recording.path] ? 'opacity-50' : ''}`}
              aria-label="Transcribe recording"
            >
              {isTranscribing[recording.path] ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <FileText size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p
            className={
              effectiveTheme === 'dark'
                ? 'text-app-dark-text-secondary'
                : 'text-app-light-text-secondary'
            }
          >
            Duration: {formatDuration(Math.round(recording.duration || 0))}
          </p>
        </div>

        {transcriptions[recording.path] && (
          <div
            className={`p-4 rounded-lg ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface/60'
                : 'bg-app-light-surface'
            }`}
          >
            <h2
              className={`mb-2 text-lg font-medium ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-primary'
                  : 'text-app-light-text-primary'
              }`}
            >
              Transcription
            </h2>
            <p
              className={
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }
            >
              {transcriptions[recording.path]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
