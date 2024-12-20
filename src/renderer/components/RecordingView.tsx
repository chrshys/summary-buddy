import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader, Play, Edit2, Check, X } from 'lucide-react';
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
  onGenerateNotes,
  onUpdateTitle,
  recordings,
  isGeneratingNotes,
  meetingNotes,
}: RecordingViewProps) {
  const { recordingPath } = useParams<{ recordingPath: string }>();
  const { effectiveTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('my-notes');

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedTitle(e.target.value);
    },
    [],
  );

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  if (!recordingPath) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Recording not found</h2>
        </div>
      </div>
    );
  }

  const decodedPath = decodeURIComponent(recordingPath);
  const recording = recordings.find((r) => r.path === decodedPath) || null;

  if (!recording) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Recording not found</h2>
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

  const handleStartEditing = () => {
    setEditedTitle(recording.title || formattedDate);
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    if (recording && editedTitle.trim()) {
      onUpdateTitle(recording, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') handleCancelEditing();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 px-8 py-8 pb-24 overflow-y-auto">
        <div className="mb-6">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={handleTitleChange}
                className={`text-xl font-semibold bg-transparent border-b-2 border-blue-500 outline-none ${
                  effectiveTheme === 'dark'
                    ? 'text-app-dark-text-primary'
                    : 'text-app-light-text-primary'
                }`}
                onKeyDown={handleTitleKeyDown}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-green-500 hover:text-green-600"
                aria-label="Save title"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="p-1 text-red-500 hover:text-red-600"
                aria-label="Cancel editing"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                {recording.title || formattedDate}
              </h1>
              <button
                type="button"
                onClick={handleStartEditing}
                className={`p-1 opacity-50 hover:opacity-100 ${
                  effectiveTheme === 'dark'
                    ? 'text-app-dark-text-primary'
                    : 'text-app-light-text-primary'
                }`}
                aria-label="Edit title"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
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

        <div className="mx-[-16px] mb-8">
          <div
            className={`px-6 pt-6 pb-3 rounded-xl ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface/30'
                : 'bg-app-light-surface/50'
            }`}
          >
            <div className="flex flex-col gap-2">
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

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary'
                      : 'text-app-light-text-secondary'
                  }`}
                >
                  0:00
                </span>
                <button
                  type="button"
                  onClick={() => onPlay(recording)}
                  className={`flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-80 rounded-full ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-text-primary/10'
                      : 'bg-app-light-text-primary/10'
                  }`}
                  aria-label="Play recording"
                >
                  <Play size={16} className="text-blue-500" />
                </button>
                <span
                  className={`text-xs font-medium ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary'
                      : 'text-app-light-text-secondary'
                  }`}
                >
                  {formatDuration(Math.round(recording.duration || 0))}
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

        {(() => {
          if (activeTab === 'my-notes') {
            return (
              <div className="min-h-[200px]">
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Coming soon...
                </p>
              </div>
            );
          }

          if (meetingNotes[recording.path]) {
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
                    {meetingNotes[recording.path]}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          return (
            <div className="py-8 text-center">
              <button
                type="button"
                onClick={() => onGenerateNotes(recording)}
                disabled={isGeneratingNotes[recording.path]}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  effectiveTheme === 'dark'
                    ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                    : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                } ${isGeneratingNotes[recording.path] ? 'opacity-50' : ''}`}
              >
                {isGeneratingNotes[recording.path] ? (
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
  );
}
