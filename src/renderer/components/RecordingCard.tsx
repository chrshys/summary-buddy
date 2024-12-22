import React from 'react';
import { Play, Wand2, Loader, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultTitle } from '../utils/dateFormatting';

interface RecordingCardProps {
  recording: Recording;
  hasAiSummary?: boolean;
  isGeneratingSummary?: boolean;
  onDelete: () => Promise<void>;
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
    ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary bg-neutral-800 hover:bg-neutral-700'
    : 'text-app-light-text-secondary hover:text-app-light-text-primary bg-neutral-100 hover:bg-neutral-200';
};

export default function RecordingCard({
  recording,
  hasAiSummary = false,
  isGeneratingSummary = false,
  onDelete,
}: RecordingCardProps) {
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const date = recording.date ? new Date(recording.date) : null;
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  const handleCardClick = () => {
    navigate(`/recording/${encodeURIComponent(recording.path)}`, {
      state: { shouldAutoPlay: false },
    });
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    // Simply navigate with autoPlay flag
    navigate(`/recording/${encodeURIComponent(recording.path)}`, {
      state: { shouldAutoPlay: true },
    });
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={`relative flex flex-col p-3 transition-all duration-200 border rounded-lg group cursor-pointer ${getCardClasses(
        effectiveTheme,
      )}`}
    >
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className={`absolute right-2 top-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
          effectiveTheme === 'dark'
            ? 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800'
            : 'text-neutral-400 hover:text-red-500 hover:bg-neutral-100'
        }`}
        aria-label="Delete recording"
      >
        <Trash2 size={16} className={isDeleting ? 'animate-pulse' : ''} />
      </button>
      <div className="flex flex-col flex-1 min-w-0">
        <span className={`text-xs mb-1 ${getTimeClasses(effectiveTheme)}`}>
          {formattedDateTime}
        </span>
        <span
          className={`text-xl font-medium mb-2 ${getDateClasses(effectiveTheme)}`}
        >
          {recording.title || defaultTitle}
        </span>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePlayClick}
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
          {(hasAiSummary || isGeneratingSummary) && (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-tertiary border-app-dark-border/50'
                  : 'text-app-light-text-tertiary border-app-light-border'
              }`}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span className="text-xs">Generating Summary...</span>
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  <span className="text-xs">AI Summary</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
