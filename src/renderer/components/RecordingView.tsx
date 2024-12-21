import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader, Play, Edit2, Mic } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';

type Tab = 'my-notes' | 'summary';

const MarkdownComponents: Partial<Components> = {
  ul: ({ children, className }) => (
    <ul
      className={`list-disc ml-4 space-y-0.5 leading-normal ${className || ''}`}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className }) => (
    <ol
      className={`list-decimal ml-4 space-y-0.5 leading-normal ${className || ''}`}
    >
      {children}
    </ol>
  ),
  li: ({ children, className }) => (
    <li className={`pl-1 leading-normal ${className || ''}`}>{children}</li>
  ),
  p: ({ children, className }) => (
    <p className={`mb-3 ${className || ''}`}>{children}</p>
  ),
  h1: ({ children, className }) => (
    <h1 className={`text-base font-bold mb-3 mt-8 ${className || ''}`}>
      {children}
    </h1>
  ),
  h2: ({ children, className }) => (
    <h2 className={`text-sm font-bold mb-2 mt-6 ${className || ''}`}>
      {children}
    </h2>
  ),
  h3: ({ children, className }) => (
    <h3 className={`text-sm font-semibold mb-2 mt-4 ${className || ''}`}>
      {children}
    </h3>
  ),
};

interface RecordingViewProps {
  onPlay: (recording: Recording) => void;
  onGenerateNotes: (recording: Recording) => Promise<void>;
  onUpdateTitle: (recording: Recording, newTitle: string) => void;
  recordings: Recording[];
  isGeneratingNotes: Record<string, boolean>;
  meetingNotes: Record<string, string>;
  isRecording: boolean;
  elapsedTime: number;
  onStopRecording: () => void;
  audioLevel?: number;
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

const getButtonClassName = (isRecording: boolean, theme: 'light' | 'dark') => {
  const baseClasses =
    'flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-80 rounded-full';

  if (isRecording) {
    return `${baseClasses} bg-red-500`;
  }

  return `${baseClasses} ${
    theme === 'dark'
      ? 'bg-app-dark-text-primary/10'
      : 'bg-app-light-text-primary/10'
  }`;
};

export default function RecordingView({
  onPlay,
  onGenerateNotes,
  onUpdateTitle,
  recordings,
  isGeneratingNotes,
  meetingNotes,
  isRecording,
  elapsedTime,
  onStopRecording,
  audioLevel = 0,
}: RecordingViewProps) {
  const { recordingPath } = useParams<{ recordingPath: string }>();
  const { effectiveTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('my-notes');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [localRecording, setLocalRecording] = useState<Recording | null>(null);

  const decodedPath = recordingPath ? decodeURIComponent(recordingPath) : '';
  const recording = recordings.find((r) => r.path === decodedPath);

  const currentRecording =
    localRecording ||
    recording ||
    (isRecording
      ? {
          path: decodedPath || 'in-progress',
          name: 'New Recording',
          date: new Date().toISOString(),
          duration: 0,
          isActive: true,
        }
      : null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setLocalRecording(null);
  }, [recording]);

  const activeRecording = currentRecording || {
    path: 'in-progress',
    name: 'New Recording',
    date: new Date().toISOString(),
    duration: 0,
    isActive: true,
  };

  const date = activeRecording.date
    ? new Date(activeRecording.date)
    : new Date();
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();

  const handleStartEditing = () => {
    setEditedTitle(activeRecording.title || formattedDate);
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    if (activeRecording && editedTitle.trim()) {
      const updatedRecording = {
        ...activeRecording,
        title: editedTitle.trim(),
      };
      setLocalRecording(updatedRecording);
      onUpdateTitle(updatedRecording, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const renderAudioVisualization = () => {
    const scaledLevel = Math.min(
      Math.max(Math.log10(audioLevel * 100 + 1) * 50, 0),
      100,
    );

    return (
      <div className="relative w-full h-1.5">
        <div
          className="absolute left-0 top-0 h-1.5 bg-blue-500 transition-all duration-50"
          style={{
            width: `${scaledLevel}%`,
            transform: `scaleX(1)`,
            transformOrigin: 'left',
          }}
        />
        <div
          className={`absolute top-0 left-0 w-full h-1.5 rounded-full ${
            effectiveTheme === 'dark'
              ? 'bg-app-dark-surface/50'
              : 'bg-app-light-surface'
          }`}
          style={{ zIndex: -1 }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 px-8 py-8 pb-24 overflow-y-auto">
        <div className="mb-6">
          <p
            className={`text-xs mb-1 ${
              effectiveTheme === 'dark'
                ? 'text-app-dark-text-secondary'
                : 'text-app-light-text-secondary'
            }`}
          >
            {`${formattedDate} • ${formattedTime}`}
          </p>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                    }
                  }}
                  className={`text-xl font-semibold px-2 py-1 rounded-md border ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-surface border-app-dark-border text-app-dark-text-primary'
                      : 'bg-app-light-surface border-app-light-border text-app-light-text-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className={`p-1 opacity-50 hover:opacity-100 ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-primary'
                      : 'text-app-light-text-primary'
                  }`}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`p-1 opacity-50 hover:opacity-100 ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-primary'
                      : 'text-app-light-text-primary'
                  }`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold">
                  {activeRecording.title || formattedDate}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className={`p-1 opacity-50 hover:opacity-100 ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-primary'
                      : 'text-app-light-text-primary'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mx-[-16px] mb-8">
          <div
            className={`px-6 pt-6 pb-3 rounded-xl ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface/30'
                : 'bg-app-light-surface/50'
            }`}
          >
            <div className="flex flex-col gap-2">
              {isRecording ? (
                renderAudioVisualization()
              ) : (
                <div className="relative w-full">
                  <div
                    className={`h-1.5 rounded-full ${
                      effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface/50'
                        : 'bg-app-light-surface'
                    }`}
                  >
                    <div
                      className="absolute top-0 left-0 h-1.5 rounded-full bg-blue-500"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary'
                      : 'text-app-light-text-secondary'
                  }`}
                >
                  {formatDuration(elapsedTime)}
                </span>
                <button
                  type="button"
                  onClick={
                    isRecording
                      ? onStopRecording
                      : () => onPlay(activeRecording)
                  }
                  className={getButtonClassName(isRecording, effectiveTheme)}
                  aria-label={isRecording ? 'Stop Recording' : 'Play Recording'}
                >
                  {isRecording ? (
                    <Mic size={16} className="text-white" />
                  ) : (
                    <Play size={16} className="text-blue-500" />
                  )}
                </button>
                <span
                  className={`text-xs font-medium ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary'
                      : 'text-app-light-text-secondary'
                  }`}
                >
                  {formatDuration(Math.round(activeRecording.duration || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex mb-6 space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'my-notes'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              effectiveTheme === 'dark'
                ? 'text-app-dark-text-primary'
                : 'text-app-light-text-primary'
            }`}
            onClick={() => setActiveTab('my-notes')}
          >
            My Notes
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              effectiveTheme === 'dark'
                ? 'text-app-dark-text-primary'
                : 'text-app-light-text-primary'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
        </div>

        <div className="min-h-[200px]">
          {(() => {
            if (isRecording) {
              return (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Recording in progress...
                </p>
              );
            }

            if (meetingNotes[activeRecording.path]) {
              return (
                <div>
                  <div
                    className={`prose prose-sm max-w-none leading-relaxed ${
                      effectiveTheme === 'dark'
                        ? 'text-app-dark-text-secondary prose-headings:text-app-dark-text-primary prose-strong:text-app-dark-text-primary prose-li:text-app-dark-text-secondary'
                        : 'text-app-light-text-secondary prose-headings:text-app-light-text-primary prose-strong:text-app-light-text-primary prose-li:text-app-light-text-secondary'
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {meetingNotes[activeRecording.path]}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            }

            return (
              <div className="py-8 text-center">
                <button
                  type="button"
                  onClick={() => onGenerateNotes(activeRecording)}
                  disabled={isGeneratingNotes[activeRecording.path]}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                      : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                  } ${isGeneratingNotes[activeRecording.path] ? 'opacity-50' : ''}`}
                >
                  {isGeneratingNotes[activeRecording.path] ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Generating Notes...
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      Generate Notes
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
