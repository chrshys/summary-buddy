import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Recording } from '../types/recording';
import RecordingCard from './RecordingCard';
import ActiveRecordingCard from './ActiveRecordingCard';

export interface RecordingsListProps {
  recordings: Recording[];
  onStopRecording?: () => void;
  elapsedTime: number;
  isGeneratingNotes: Record<string, boolean>;
  onDeleteRecording: (recording: Recording) => Promise<void>;
}

export default function RecordingsList({
  recordings,
  onStopRecording = undefined,
  elapsedTime,
  isGeneratingNotes,
  onDeleteRecording,
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
              hasAiSummary={Boolean(recording.aiNotes)}
              isGeneratingSummary={isGeneratingNotes[recording.path]}
              onDelete={() => onDeleteRecording(recording)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
