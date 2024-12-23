import React from 'react';
import { Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import formatTime from '../utils/time';
import { useTheme } from '../contexts/ThemeContext';

interface ActiveRecordingCardProps {
  elapsedTime: number;
  onStopRecording: () => void;
  recordingPath?: string;
}

export default function ActiveRecordingCard({
  elapsedTime,
  onStopRecording,
  recordingPath = 'in-progress',
}: ActiveRecordingCardProps) {
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling to parent elements
    e.stopPropagation();
    navigate(`/recording/${encodeURIComponent(recordingPath)}`);
  };

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStopRecording();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
      onClick={handleClick}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
        effectiveTheme === 'dark'
          ? 'bg-red-900/30 border-red-500/50 hover:bg-red-900/40'
          : 'bg-red-50 border-red-400 hover:bg-red-100/80'
      }`}
    >
      <button
        type="button"
        onClick={handleStopClick}
        className={`p-2 mr-3 transition-colors rounded-md ${
          effectiveTheme === 'dark'
            ? 'text-red-200 hover:text-red-100 hover:bg-red-900/50'
            : 'text-red-600 hover:text-red-700 hover:bg-red-100/80'
        }`}
        aria-label="Stop recording"
      >
        <Square size={16} />
      </button>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-xs truncate ${
              effectiveTheme === 'dark' ? 'text-red-200' : 'text-red-700'
            }`}
          >
            {formattedDate}
          </span>
          <span
            className={`text-xs ${
              effectiveTheme === 'dark' ? 'text-red-300/70' : 'text-red-600/70'
            }`}
          >
            {formattedTime}
          </span>
        </div>
        <div
          className={`text-xs ${
            effectiveTheme === 'dark' ? 'text-red-300' : 'text-red-600'
          }`}
        >
          {formatTime(elapsedTime)}
        </div>
      </div>
    </motion.div>
  );
}
