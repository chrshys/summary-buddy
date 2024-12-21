import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FileText, Loader, Edit2, Wand2 } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultTitle } from '../utils/dateFormatting';
import RecordButton from './RecordButton';
import AudioPlayer from './AudioPlayer';

type Tab = 'my-notes' | 'summary';

const MarkdownComponents: Partial<Components> = {
  ul: ({ children, className }) => (
    <ul
      className={`list-disc ml-4 space-y-1 mb-6 leading-normal ${className || ''}`}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className }) => (
    <ol
      className={`list-decimal ml-4 space-y-1 mb-6 leading-normal ${className || ''}`}
    >
      {children}
    </ol>
  ),
  li: ({ children, className }) => (
    <li className={`pl-1 leading-normal ${className || ''}`}>{children}</li>
  ),
  p: ({ children, className }) => (
    <p className={`mb-4 ${className || ''}`}>{children}</p>
  ),
  h1: ({ children, className }) => (
    <h1 className={`text-sm font-bold mb-2 mt-6 ${className || ''}`}>
      {children}
    </h1>
  ),
  h2: ({ children, className }) => (
    <h2 className={`text-sm font-bold mb-2 mt-6 ${className || ''}`}>
      {children}
    </h2>
  ),
  h3: ({ children, className }) => (
    <h3 className={`text-sm font-bold mb-2 mt-6 ${className || ''}`}>
      {children}
    </h3>
  ),
};

interface RecordingViewProps {
  onGenerateNotes: (recording: Recording) => Promise<void>;
  onUpdateTitle: (recording: Recording, newTitle: string) => void;
  recordings: Recording[];
  isGeneratingNotes: Record<string, boolean>;
  meetingNotes: Record<string, string>;
  isRecording: boolean;
  elapsedTime: number;
  onStopRecording: () => void;
  audioLevel?: number;
  onSaveManualNotes?: (recording: Recording, notes: string) => Promise<void>;
  manualNotes?: Record<string, string>;
}

export default function RecordingView({
  onGenerateNotes,
  onUpdateTitle,
  recordings,
  isGeneratingNotes,
  meetingNotes,
  isRecording,
  elapsedTime,
  onStopRecording,
  audioLevel = 0,
  onSaveManualNotes,
  manualNotes = {},
}: RecordingViewProps) {
  const { recordingPath } = useParams<{ recordingPath: string }>();
  const { effectiveTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('my-notes');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [localRecording, setLocalRecording] = useState<Recording | null>(null);
  const [localNotes, setLocalNotes] = useState('');
  const { state } = useLocation();
  const shouldAutoPlay = state?.shouldAutoPlay ?? false;

  const decodedPath = recordingPath ? decodeURIComponent(recordingPath) : '';
  const recording = recordings.find((r) => r.path === decodedPath);

  const activeRecording = useMemo(() => {
    return (
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
        : null)
    );
  }, [localRecording, recording, isRecording, decodedPath]);

  const currentRecording = useMemo(
    () =>
      activeRecording || {
        path: 'in-progress',
        name: 'New Recording',
        date: new Date().toISOString(),
        duration: 0,
        isActive: true,
      },
    [activeRecording],
  );

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setLocalRecording(null);
  }, [recording]);

  useEffect(() => {
    if (currentRecording && manualNotes[currentRecording.path]) {
      setLocalNotes(manualNotes[currentRecording.path]);
    } else {
      setLocalNotes('');
    }
  }, [currentRecording, manualNotes]);

  useEffect(() => {
    if (!isRecording && currentRecording && onSaveManualNotes && localNotes) {
      onSaveManualNotes(currentRecording, localNotes);
    }
  }, [isRecording, currentRecording, onSaveManualNotes, localNotes]);

  useEffect(() => {
    if (shouldAutoPlay && currentRecording && !isRecording) {
      const timer = setTimeout(() => {
        const audioPlayer = document.querySelector('audio');
        if (audioPlayer) {
          audioPlayer.play().catch(() => {
            // Error handling removed
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldAutoPlay, currentRecording, isRecording]);

  const date = currentRecording.date
    ? new Date(currentRecording.date)
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
    setEditedTitle(currentRecording.title || getDefaultTitle(date));
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      const updatedRecording = {
        ...currentRecording,
        title: editedTitle.trim(),
      };
      if (localRecording) {
        setLocalRecording({
          ...localRecording,
          title: editedTitle.trim(),
        });
      }
      onUpdateTitle(updatedRecording, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  };

  const handleSaveNotes = async () => {
    if (onSaveManualNotes) {
      await onSaveManualNotes(currentRecording, localNotes);
    }
  };

  return (
    <div className="flex flex-col items-center h-[calc(100vh-36px)]">
      <div className="flex flex-col items-center justify-center min-h-[180px] pt-16 pb-12 w-full">
        {isRecording ? (
          <RecordButton
            isRecording={isRecording}
            audioLevel={audioLevel}
            elapsedTime={elapsedTime}
            onToggleRecording={onStopRecording}
          />
        ) : (
          currentRecording && (
            <AudioPlayer
              src={currentRecording.path}
              onPlaybackComplete={() => {
                // Handle playback complete if needed
              }}
              autoPlay={shouldAutoPlay}
            />
          )
        )}
      </div>

      <div className="flex-1 w-full overflow-y-auto">
        <div className="px-4">
          <div className="mb-8">
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
                <div className="flex items-center gap-2 flex-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        setIsEditing(false);
                      }
                    }}
                    className={`text-2xl font-semibold px-2 py-1 rounded-md border flex-1 max-w-full ${
                      effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface border-app-dark-border text-app-dark-text-primary'
                        : 'bg-app-light-surface border-app-light-border text-app-light-text-primary'
                    }`}
                  />
                </div>
              ) : (
                <div className="group flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">
                    {currentRecording.title || getDefaultTitle(date)}
                  </h1>
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    title="Edit title"
                    className={`p-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity ${
                      effectiveTheme === 'dark'
                        ? 'text-app-dark-text-primary'
                        : 'text-app-light-text-primary'
                    }`}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pb-8">
            <div
              className={`flex flex-col p-3 transition-all duration-200 border rounded-lg ${
                effectiveTheme === 'dark'
                  ? 'bg-app-dark-surface/40 border-app-dark-border/50'
                  : 'bg-app-light-surface border-app-light-border'
              }`}
            >
              <div className="flex space-x-4">
                <button
                  type="button"
                  className={`py-1.5 text-xs font-medium transition-colors focus:outline-none ${
                    activeTab === 'my-notes'
                      ? `bg-${effectiveTheme === 'dark' ? '[#3B4252]' : '[#E5E9F0]'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary shadow-sm border-b-2 border-b-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary`
                      : `bg-${effectiveTheme === 'dark' ? 'black/20' : 'black/5'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-secondary hover:text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary hover:bg-${effectiveTheme === 'dark' ? '[#2E3440]' : '[#D8DEE9]'}`
                  }`}
                  onClick={() => setActiveTab('my-notes')}
                >
                  My Notes
                </button>
                <button
                  type="button"
                  className={`py-1.5 text-xs font-medium transition-colors focus:outline-none inline-flex items-center gap-2 ${
                    activeTab === 'summary'
                      ? `bg-${effectiveTheme === 'dark' ? '[#3B4252]' : '[#E5E9F0]'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary shadow-sm border-b-2 border-b-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary`
                      : `bg-${effectiveTheme === 'dark' ? 'black/20' : 'black/5'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-secondary hover:text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary hover:bg-${effectiveTheme === 'dark' ? '[#2E3440]' : '[#D8DEE9]'}`
                  }`}
                  onClick={() => setActiveTab('summary')}
                >
                  <Wand2 size={16} />
                  AI Summary
                </button>
              </div>

              <div className="min-h-[200px] mt-6">
                {(() => {
                  if (activeTab === 'my-notes') {
                    return (
                      <div className="flex flex-col gap-4">
                        <textarea
                          value={localNotes}
                          onChange={handleNotesChange}
                          onBlur={handleSaveNotes}
                          placeholder="Type your notes here..."
                          className={`w-full h-[400px] p-3 text-sm rounded-md border resize-y ${
                            effectiveTheme === 'dark'
                              ? 'bg-app-dark-surface border-app-dark-border text-app-dark-text-primary'
                              : 'bg-app-light-surface border-app-light-border text-app-light-text-primary'
                          }`}
                        />
                      </div>
                    );
                  }

                  if (meetingNotes[currentRecording.path]) {
                    return (
                      <div>
                        <div
                          className={`prose prose-sm max-w-none leading-relaxed pb-8 ${
                            effectiveTheme === 'dark'
                              ? 'text-app-dark-text-secondary/95 prose-headings:text-app-dark-text-primary prose-strong:text-app-dark-text-primary prose-li:text-app-dark-text-secondary/95 text-xs'
                              : 'text-app-light-text-secondary/95 prose-headings:text-app-light-text-primary prose-strong:text-app-light-text-primary prose-li:text-app-light-text-secondary/95 text-xs'
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                          >
                            {meetingNotes[currentRecording.path]}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="py-8 text-center">
                      <div
                        className={`p-4 rounded-lg border ${
                          effectiveTheme === 'dark'
                            ? 'bg-app-dark-surface/40 border-app-dark-border/50'
                            : 'bg-app-light-surface border-app-light-border'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onGenerateNotes(currentRecording)}
                          disabled={isGeneratingNotes[currentRecording.path]}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                            effectiveTheme === 'dark'
                              ? 'bg-app-dark-surface text-app-dark-text-primary hover:bg-app-dark-surface/80'
                              : 'bg-app-light-surface text-app-light-text-primary hover:bg-app-light-surface/80'
                          } ${isGeneratingNotes[currentRecording.path] ? 'opacity-50' : ''}`}
                        >
                          {isGeneratingNotes[currentRecording.path] ? (
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
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
