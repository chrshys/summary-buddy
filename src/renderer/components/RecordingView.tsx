import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, FileText, Loader } from 'lucide-react';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import type { DiarizedSegment } from '../../main/services/diarization';

type Tab = 'transcription' | 'summary' | 'actionItems';

interface TabButtonProps {
  tab: Tab;
  label: string;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
  effectiveTheme: string;
}

function TabButton({
  tab,
  label,
  activeTab,
  onClick,
  effectiveTheme,
}: TabButtonProps) {
  const isActive = activeTab === tab;
  const isDark = effectiveTheme === 'dark';

  const getThemeClasses = () => {
    if (isDark) {
      return isActive
        ? 'bg-app-dark-surface text-app-dark-text-primary'
        : 'text-app-dark-text-secondary hover:text-app-dark-text-primary';
    }
    return isActive
      ? 'bg-app-light-surface text-app-light-text-primary'
      : 'text-app-light-text-secondary hover:text-app-light-text-primary';
  };

  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${getThemeClasses()}`}
    >
      {label}
    </button>
  );
}

interface RecordingViewProps {
  onPlay: (recording: Recording) => void;
  onTranscribe: (recording: Recording) => Promise<void>;
  onCreateSummary: (recording: Recording) => Promise<void>;
  onCreateActionItems: (recording: Recording) => Promise<void>;
  recordings: Recording[];
  isTranscribing: Record<string, boolean>;
  isSummarizing: Record<string, boolean>;
  isGeneratingActionItems: Record<string, boolean>;
  transcriptions: Record<string, { segments: DiarizedSegment[] }>;
  summaries: Record<string, string>;
  actionItems: Record<string, string>;
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
  onCreateSummary,
  onCreateActionItems,
  recordings,
  isTranscribing,
  isSummarizing,
  isGeneratingActionItems,
  transcriptions,
  summaries,
  actionItems,
}: RecordingViewProps) {
  const { recordingPath } = useParams<{ recordingPath: string }>();
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('transcription');

  useEffect(() => {
    if (recordingPath) {
      const decodedPath = decodeURIComponent(recordingPath);
      const foundRecording = recordings.find((r) => r.path === decodedPath);
      setRecording(foundRecording || null);

      // Load files if they exist
      if (foundRecording) {
        const loadFiles = async () => {
          try {
            // Try to load transcription
            const transcriptionPath = `${decodedPath}.txt`;
            const transcriptionExists =
              await window.electron.fileSystem.exists(transcriptionPath);
            if (transcriptionExists) {
              const transcriptionText =
                await window.electron.fileSystem.readFile(transcriptionPath);
              const segments = transcriptionText
                .split('\n')
                .map((line: string) => {
                  const [speaker, ...textParts] = line.split(': ');
                  return {
                    speaker: speaker.replace('[', '').replace(']', ''),
                    text: textParts.join(': '),
                    start: 0, // We don't have timing info in the file
                    end: 0,
                    confidence: 1,
                  };
                });
              transcriptions[decodedPath] = { segments };
            }

            // Try to load summary
            const summaryPath = `${decodedPath}.summary.txt`;
            const summaryExists =
              await window.electron.fileSystem.exists(summaryPath);
            if (summaryExists) {
              const summaryText =
                await window.electron.fileSystem.readFile(summaryPath);
              summaries[decodedPath] = summaryText;
            }

            // Try to load action items
            const actionItemsPath = `${decodedPath}.actions.txt`;
            const actionItemsExist =
              await window.electron.fileSystem.exists(actionItemsPath);
            if (actionItemsExist) {
              const actionItemsText =
                await window.electron.fileSystem.readFile(actionItemsPath);
              actionItems[decodedPath] = actionItemsText;
            }
          } catch (error) {
            /* empty */
          }
        };

        loadFiles();
      }
    }
  }, [recordingPath, recordings, transcriptions, summaries, actionItems]);

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

      <div className="flex-1 px-3 pb-12 overflow-y-auto">
        <div className="flex items-center justify-between mt-4 mb-4">
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
          </div>
        </div>

        <div className="mb-6">
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

        <div className="flex gap-2 mb-4">
          <TabButton
            tab="transcription"
            label="Transcription"
            activeTab={activeTab}
            onClick={setActiveTab}
            effectiveTheme={effectiveTheme}
          />
          <TabButton
            tab="summary"
            label="Summary"
            activeTab={activeTab}
            onClick={setActiveTab}
            effectiveTheme={effectiveTheme}
          />
          <TabButton
            tab="actionItems"
            label="Action Items"
            activeTab={activeTab}
            onClick={setActiveTab}
            effectiveTheme={effectiveTheme}
          />
        </div>

        <div
          className={`p-4 rounded-lg ${
            effectiveTheme === 'dark'
              ? 'bg-app-dark-surface/60'
              : 'bg-app-light-surface'
          }`}
        >
          {activeTab === 'transcription' && (
            <div>
              {transcriptions[recording.path] ? (
                transcriptions[recording.path].segments.map((segment) => (
                  <div key={`${segment.start}-${segment.end}`} className="mb-4">
                    <p
                      className={`font-medium mb-1 ${
                        effectiveTheme === 'dark'
                          ? 'text-app-dark-text-primary'
                          : 'text-app-light-text-primary'
                      }`}
                    >
                      {segment.speaker}
                    </p>
                    <p
                      className={
                        effectiveTheme === 'dark'
                          ? 'text-app-dark-text-secondary'
                          : 'text-app-light-text-secondary'
                      }
                    >
                      {segment.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <button
                    type="button"
                    onClick={() => onTranscribe(recording)}
                    disabled={isTranscribing[recording.path]}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                        : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                    } ${isTranscribing[recording.path] ? 'opacity-50' : ''}`}
                  >
                    {isTranscribing[recording.path] ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Creating Transcription...
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        Create Transcription
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'summary' && (
            <div>
              {summaries[recording.path] ? (
                <p
                  className={
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary'
                      : 'text-app-light-text-secondary'
                  }
                >
                  {summaries[recording.path]}
                </p>
              ) : (
                <div className="py-8 text-center">
                  <button
                    type="button"
                    onClick={() => onCreateSummary(recording)}
                    disabled={isSummarizing[recording.path]}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                        : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                    } ${isSummarizing[recording.path] ? 'opacity-50' : ''}`}
                  >
                    {isSummarizing[recording.path] ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Creating Summary...
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        Create Summary
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'actionItems' && (
            <div>
              {actionItems[recording.path] ? (
                <div>
                  <ul className="pl-5 space-y-2 list-disc">
                    {actionItems[recording.path]
                      .split('\n')
                      .filter(Boolean)
                      .map((item) => (
                        <li
                          key={item.replace(/\s+/g, '-').toLowerCase()}
                          className={
                            effectiveTheme === 'dark'
                              ? 'text-app-dark-text-secondary'
                              : 'text-app-light-text-secondary'
                          }
                        >
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <button
                    type="button"
                    onClick={() => onCreateActionItems(recording)}
                    disabled={isGeneratingActionItems[recording.path]}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                        : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                    } ${isGeneratingActionItems[recording.path] ? 'opacity-50' : ''}`}
                  >
                    {isGeneratingActionItems[recording.path] ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Creating Action Items...
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        Create Action Items
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
