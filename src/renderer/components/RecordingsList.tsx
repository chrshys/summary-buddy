import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Recording } from '../types/recording';
import RecordingCard from './RecordingCard';
import ActiveRecordingCard from './ActiveRecordingCard';

export interface RecordingsListProps {
  recordings: Recording[];
  onStopRecording?: () => void;
  elapsedTime: number;
}

export default function RecordingsList({
  recordings,
  onStopRecording = undefined,
  elapsedTime,
}: RecordingsListProps) {
  // Get the active recording's path if it exists
  const activeRecording = recordings.find((r) => r.isActive);
  const activeRecordingPath = activeRecording?.path;

  return (
    <div className="w-full overflow-y-auto">
      <div className="space-y-4 px-4 pb-4 pr-[10px]">
        <AnimatePresence initial={false}>
          {onStopRecording && (
            <ActiveRecordingCard
              key="active-recording"
              elapsedTime={elapsedTime}
              onStopRecording={onStopRecording}
              recordingPath={activeRecordingPath}
            />
          )}
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.path}
              recording={recording}
              hasAiSummary={recording.hasAiSummary}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
