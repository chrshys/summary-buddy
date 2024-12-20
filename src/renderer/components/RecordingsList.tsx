import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Recording } from '../types/recording';
import RecordingCard from './RecordingCard';
import ActiveRecordingCard from './ActiveRecordingCard';

export interface RecordingsListProps {
  recordings: Recording[];
  onPlay: (recording: Recording) => Promise<void>;
  onDelete: (recording: Recording) => Promise<void>;
  onStopRecording?: () => void;
  elapsedTime: number;
}

export default function RecordingsList({
  recordings,
  onPlay,
  onDelete,
  onStopRecording,
  elapsedTime,
}: RecordingsListProps) {
  const handleDelete = async (recording: Recording) => {
    try {
      await onDelete(recording);
    } catch (error: unknown) {
      // Type guard to check if error is a NodeJS.ErrnoException
      if (error instanceof Error && 'code' in error) {
        if (error.code !== 'ENOENT') {
          /* empty */
        }
      } else {
        /* empty */
      }
    }
  };

  return (
    <div className="w-full overflow-y-auto">
      <div className="space-y-4 px-4 pb-4 pr-[10px]">
        <AnimatePresence initial={false}>
          {onStopRecording && (
            <ActiveRecordingCard
              key="active-recording"
              elapsedTime={elapsedTime}
              onStopRecording={onStopRecording}
            />
          )}
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.id || recording.path}
              recording={recording}
              onPlay={onPlay}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

RecordingsList.defaultProps = {
  onStopRecording: undefined,
};
