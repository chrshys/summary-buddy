import React, { useState } from 'react';
import { Play, Trash2, FileText, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';

interface RecordingCardProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
  onTranscribe: (recording: Recording) => Promise<void>;
  isTranscribing?: boolean;
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

const getCardClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'bg-app-dark-surface/40 hover:bg-app-dark-surface/60 border-app-dark-border/50'
    : 'bg-app-light-surface hover:bg-app-light-border border-app-light-border';
};

const getDateClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'text-app-dark-text-primary'
    : 'text-app-light-text-primary';
};

const getTimeClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'text-app-dark-text-tertiary'
    : 'text-app-light-text-tertiary';
};

const getDurationClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'text-app-dark-text-secondary'
    : 'text-app-light-text-secondary';
};

const getPlayButtonClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface/50'
    : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface/50';
};

const getDeleteButtonClasses = (theme: 'light' | 'dark'): string => {
  return theme === 'dark'
    ? 'text-app-dark-text-secondary hover:text-red-400 hover:bg-app-dark-surface/50'
    : 'text-app-light-text-secondary hover:text-red-600 hover:bg-app-light-surface/50';
};

export default function RecordingCard({
  recording,
  onPlay,
  onDelete,
  onTranscribe,
  isTranscribing = false,
}: RecordingCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const date = recording.date ? new Date(recording.date) : null;
  const formattedDate = date
    ? `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : 'Untitled Recording';

  const formattedTime = date
    ? date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const handleDelete = async (rec: Recording) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(rec);
    } catch (error) {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/recording/${encodeURIComponent(recording.path)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={`flex flex-col p-3 transition-all duration-200 border rounded-lg group cursor-pointer ${getCardClasses(
        effectiveTheme,
      )}`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(recording);
          }}
          className={`p-2 mr-3 transition-colors rounded-md ${getPlayButtonClasses(
            effectiveTheme,
          )}`}
          aria-label="Play recording"
        >
          <Play size={16} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xs truncate ${getDateClasses(effectiveTheme)}`}
            >
              {formattedDate}
            </span>
            <span className={`text-xs ${getTimeClasses(effectiveTheme)}`}>
              {formattedTime}
            </span>
          </div>
          <div className={`text-xs ${getDurationClasses(effectiveTheme)}`}>
            {recording.duration
              ? formatDuration(Math.round(recording.duration))
              : 'Processing...'}
          </div>
        </div>
        <div className="flex ml-4 transition-opacity opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTranscribe(recording);
            }}
            disabled={isTranscribing}
            className={`p-2 transition-colors rounded-md ${getPlayButtonClasses(
              effectiveTheme,
            )} ${isTranscribing ? 'opacity-50' : ''}`}
            aria-label="Transcribe recording"
          >
            {isTranscribing ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(recording);
            }}
            disabled={isDeleting}
            className={`p-2 transition-colors rounded-md ${getDeleteButtonClasses(
              effectiveTheme,
            )} ${isDeleting ? 'opacity-50' : ''}`}
            aria-label="Delete recording"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
