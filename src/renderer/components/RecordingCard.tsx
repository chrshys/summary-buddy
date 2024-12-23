import React from 'react';
import { Play, Wand2, Loader, Trash2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import getDefaultTitle from '../utils/dateFormatting';
import type { Channels } from '../types/electron';

interface RecordingCardProps {
  recording: Recording;
  hasAiSummary?: boolean;
  isGeneratingSummary?: boolean;
  hasManualNotes?: boolean;
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

const getLabelClasses = (
  theme: 'light' | 'dark',
  isClickable: boolean,
): string => {
  const baseClasses =
    theme === 'dark'
      ? 'text-app-dark-text-tertiary border-app-dark-border/50'
      : 'text-app-light-text-tertiary border-app-light-border';

  return isClickable
    ? `${baseClasses} cursor-pointer hover:bg-black/5 dark:hover:bg-white/5`
    : baseClasses;
};

export default function RecordingCard({
  recording,
  hasAiSummary = false,
  isGeneratingSummary = false,
  hasManualNotes = false,
  onDelete,
}: RecordingCardProps) {
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const date = recording.date ? new Date(recording.date) : null;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isRecordingView = location.pathname.startsWith('/recording/');

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

  const handleNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isRecordingView) {
      // If we're in the recording view, open transcript in notes app
      const folderPath = recording.path.split('/').slice(0, -1).join('/');
      const folderName = folderPath.split('/').pop() || '';
      const timestamp = folderName.match(/recording-(\d+)$/)?.[1];
      if (!timestamp) return;
      const transcriptPath = `${folderPath}/transcript-${timestamp}.txt`;
      window.electron.ipcRenderer.sendMessage('open-transcript' as Channels, {
        path: transcriptPath,
      });
    } else {
      // If we're in the list view, navigate to notes tab
      navigate(`/recording/${encodeURIComponent(recording.path)}`, {
        state: { activeTab: 'my-notes' },
      });
    }
  };

  const handleAiClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/recording/${encodeURIComponent(recording.path)}`, {
      state: { activeTab: 'summary' },
    });
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
          className={`text-xl font-medium mt-2 mb-4 ${getDateClasses(effectiveTheme)}`}
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
          <div className="flex gap-2">
            {hasManualNotes && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleNotesClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNotesClick(e as unknown as React.MouseEvent);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${getLabelClasses(
                  effectiveTheme,
                  true,
                )}`}
              >
                <FileText size={14} />
                <span className="text-xs">Notes</span>
              </div>
            )}
            {(hasAiSummary || isGeneratingSummary) && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleAiClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleAiClick(e as unknown as React.MouseEvent);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${getLabelClasses(
                  effectiveTheme,
                  !isGeneratingSummary,
                )}`}
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    <span className="text-xs">AI</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span className="text-xs">AI</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
