import React, { useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultTitle } from '../utils/dateFormatting';

interface RecordingCardProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
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
}: RecordingCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const date = recording.date ? new Date(recording.date) : null;

  const formattedDateTime = date
    ? `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} • ${date
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase()}`
    : '';

  const defaultTitle = date ? getDefaultTitle(date) : 'Untitled Recording';

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
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className={`text-base font-medium mb-1 ${getDateClasses(effectiveTheme)}`}
        >
          {recording.title || defaultTitle}
        </span>
        <span className={`text-xs mb-2 ${getTimeClasses(effectiveTheme)}`}>
          {formattedDateTime}
        </span>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(recording);
            }}
            className={`flex items-center gap-2 p-2 transition-colors rounded-md ${getPlayButtonClasses(
              effectiveTheme,
            )}`}
            aria-label="Play recording"
          >
            <Play size={16} />
            <span className={`text-xs ${getDurationClasses(effectiveTheme)}`}>
              {recording.duration
                ? formatDuration(Math.round(recording.duration))
                : 'Processing...'}
            </span>
          </button>
          <div className="flex transition-opacity opacity-0 group-hover:opacity-100">
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
      </div>
    </motion.div>
  );
}
