import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Loader, Wand2, Copy, Check, FileText } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultTitle } from '../utils/dateFormatting';
import AudioPlayer from './AudioPlayer';
import RecordingVisualizer from './RecordingVisualizer';
import type { Channels } from '../types/electron';

// Add NodeJS type for setTimeout
type TimeoutRef = ReturnType<typeof setTimeout>;

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
  const location = useLocation();
  const { effectiveTheme } = useTheme();
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Initialize to 'my-notes' if recording is active, otherwise use location state or default to 'my-notes'
    if (isRecording) return 'my-notes';
    return (location.state as { activeTab?: Tab })?.activeTab || 'my-notes';
  });
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const [localNotes, setLocalNotes] = useState('');
  const notesTimeoutRef = useRef<TimeoutRef>();
  const titleTimeoutRef = useRef<TimeoutRef>();
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [showFinishedPrompt, setShowFinishedPrompt] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);

  // Get autoPlay from location state
  const shouldAutoPlay =
    (location.state as { shouldAutoPlay?: boolean })?.shouldAutoPlay || false;

  const decodedPath = recordingPath ? decodeURIComponent(recordingPath) : '';
  const recording = useMemo(
    () => recordings.find((r) => r.path === decodedPath),
    [recordings, decodedPath],
  );

  /* eslint-disable-next-line consistent-return */
  const currentRecording = useMemo(() => {
    if (recording) return recording;
    if (!isRecording) return null;

    return {
      path: decodedPath || 'in-progress',
      name: 'New Recording',
      date: new Date().toISOString(),
      duration: 0,
      isActive: true,
      title: null,
    };
  }, [recording, isRecording, decodedPath]);

  // Initialize local notes from props
  useEffect(() => {
    if (currentRecording && manualNotes[currentRecording.path]) {
      setLocalNotes(manualNotes[currentRecording.path]);
    } else {
      setLocalNotes('');
    }
  }, [currentRecording, manualNotes]);

  // Debounced notes saving
  useEffect((): (() => void) | void => {
    if (!currentRecording || !onSaveManualNotes) return undefined;

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      onSaveManualNotes(currentRecording, localNotes);
    }, 1000); // Debounce for 1 second

    function cleanup(): void {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    }
    return cleanup;
  }, [localNotes, currentRecording, onSaveManualNotes]);

  // Initialize title from recording
  useEffect(() => {
    if (currentRecording) {
      setEditedTitle(
        currentRecording.title ||
          getDefaultTitle(new Date(currentRecording.date)),
      );
    }
  }, [currentRecording]);

  // Debounced title saving
  useEffect((): (() => void) | void => {
    if (!currentRecording) return undefined;

    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    titleTimeoutRef.current = setTimeout(() => {
      const trimmedTitle = editedTitle.trim();
      if (trimmedTitle && trimmedTitle !== currentRecording.title) {
        onUpdateTitle(currentRecording, trimmedTitle);
      }
    }, 1000); // Debounce for 1 second

    function cleanup(): void {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    }
    return cleanup;
  }, [editedTitle, currentRecording, onUpdateTitle]);

  // Add auto-resize handler for textarea
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedTitle(e.target.value);
      // Auto-resize the textarea
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    },
    [],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalNotes(e.target.value);
    },
    [],
  );

  // Format date and time
  const { formattedDate, formattedTime } = useMemo(() => {
    if (!currentRecording) {
      return { formattedDate: '', formattedTime: '' };
    }

    const date = new Date(currentRecording.date);
    return {
      formattedDate: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      formattedTime: date
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase(),
    };
  }, [currentRecording]);

  // Add this new handler
  const handleTitleClick = useCallback(() => {
    setIsTitleEditing(true);
    // Wait for state update and focus the input
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 0);
  }, []);

  // Add blur handler
  const handleTitleBlur = useCallback(() => {
    setIsTitleEditing(false);
  }, []);

  useEffect(() => {
    if (!isRecording && showFinishedPrompt === false) {
      setShowFinishedPrompt(true);
      if (!(location.state as { activeTab?: Tab })?.activeTab) {
        setActiveTab('summary');
      }
    }
  }, [isRecording, showFinishedPrompt, location.state]);

  // Fix the handleCopyToClipboard function spacing
  const handleCopyToClipboard = useCallback(() => {
    if (currentRecording && meetingNotes[currentRecording.path]) {
      // Create temporary element to handle HTML to plain text conversion
      const temp = document.createElement('div');
      temp.innerHTML = meetingNotes[currentRecording.path];
      navigator.clipboard.writeText(temp.textContent || temp.innerText);
      // Show success tooltip
      setShowCopyTooltip(true);
      setTimeout(() => setShowCopyTooltip(false), 2000);
    }
  }, [currentRecording, meetingNotes]);

  const renderSummaryContent = () => {
    if (!currentRecording) return null;
    if (isRecording) {
      return (
        <p
          className={`text-sm ${
            effectiveTheme === 'dark'
              ? 'text-app-dark-text-secondary'
              : 'text-app-light-text-secondary'
          }`}
        >
          AI summary will be available when recording has ended
        </p>
      );
    }

    if (showFinishedPrompt) {
      return (
        <div className="space-y-4">
          <p
            className={`text-sm ${
              effectiveTheme === 'dark'
                ? 'text-app-dark-text-primary'
                : 'text-app-light-text-primary'
            }`}
          >
            Your recording is finished, would you like me to summarize it for
            you?
          </p>
          <button
            type="button"
            onClick={() => {
              setShowFinishedPrompt(false);
              if (currentRecording) {
                onGenerateNotes(currentRecording);
              }
            }}
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
                <Wand2 size={20} />
                Generate AI Summary
              </>
            )}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (currentRecording) {
            onGenerateNotes(currentRecording);
          }
        }}
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
            <Wand2 size={20} />
            Generate AI Summary
          </>
        )}
      </button>
    );
  };

  if (!currentRecording) {
    return (
      <div className="flex items-center justify-center h-full">
        <p
          className={`text-sm ${effectiveTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}
        >
          No recording found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-[calc(100vh-36px)]">
      <div className="flex-1 w-full overflow-y-auto">
        <div className="px-4 pt-4">
          <div className="mb-6">
            <p
              className={`text-xs mb-2 pl-3 ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary/50'
                  : 'text-app-light-text-secondary/50'
              }`}
            >
              {`${formattedDate} • ${formattedTime}`}
            </p>
            <div className="flex-1">
              {isTitleEditing ? (
                <textarea
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      titleInputRef.current?.blur();
                    }
                  }}
                  placeholder="Enter title..."
                  className={`w-full p-3 text-2xl font-semibold rounded-md border resize-none overflow-hidden ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-surface border-app-dark-border text-app-dark-text-primary'
                      : 'bg-app-light-surface border-app-light-border text-app-light-text-primary'
                  }`}
                  style={{ minHeight: '2.5rem' }}
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleTitleClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleTitleClick();
                    }
                  }}
                  className={`w-full p-3 text-2xl font-semibold rounded-md cursor-text ${
                    effectiveTheme === 'dark'
                      ? 'text-app-dark-text-primary hover:bg-app-dark-surface/40'
                      : 'text-app-light-text-primary hover:bg-app-light-surface'
                  }`}
                >
                  {editedTitle || 'Enter title...'}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center mb-6 w-full">
            {isRecording ? (
              <RecordingVisualizer
                audioLevel={audioLevel}
                elapsedTime={elapsedTime}
                onStopRecording={onStopRecording}
              />
            ) : (
              currentRecording && (
                <AudioPlayer
                  src={`file://${currentRecording.path}`}
                  autoPlay={shouldAutoPlay}
                  duration={currentRecording.duration}
                />
              )
            )}
          </div>

          <div className="pb-8">
            <div
              className={`flex flex-col p-3 transition-all duration-200 border rounded-lg ${
                effectiveTheme === 'dark'
                  ? 'bg-app-dark-surface/40 border-app-dark-border/50'
                  : 'bg-app-light-surface border-app-light-border'
              }`}
            >
              <div className="flex space-x-1 mb-4 p-1 rounded-lg bg-black/5 dark:bg-black/20">
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 text-xs font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'my-notes'
                      ? `${effectiveTheme === 'dark' ? 'bg-[#3B4252]' : 'bg-white'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary shadow-sm`
                      : `text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-secondary hover:text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary`
                  }`}
                  onClick={() => setActiveTab('my-notes')}
                >
                  My Notes
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 text-xs font-medium rounded-md transition-all duration-200 inline-flex items-center justify-center gap-2 ${
                    activeTab === 'summary'
                      ? `${effectiveTheme === 'dark' ? 'bg-[#3B4252]' : 'bg-white'} text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary shadow-sm`
                      : `text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-secondary hover:text-${effectiveTheme === 'dark' ? 'app-dark' : 'app-light'}-text-primary`
                  }`}
                  onClick={() => setActiveTab('summary')}
                >
                  <Wand2 size={16} />
                  Summary
                </button>
              </div>

              <div className="min-h-[200px]">
                {(() => {
                  if (activeTab === 'my-notes') {
                    return (
                      <div className="flex flex-col gap-4">
                        <textarea
                          value={localNotes}
                          onChange={handleNotesChange}
                          placeholder="Type your notes here..."
                          className={`w-full h-[400px] p-3 text-sm rounded-md border resize-y ${
                            effectiveTheme === 'dark'
                              ? 'bg-app-dark-surface border-app-dark-border text-app-dark-text-primary'
                              : 'bg-app-light-surface border-app-light-border text-app-light-text-primary'
                          }`}
                        />
                        {!isRecording &&
                          !meetingNotes[currentRecording.path] && (
                            <button
                              type="button"
                              onClick={() => onGenerateNotes(currentRecording)}
                              disabled={
                                isGeneratingNotes[currentRecording.path]
                              }
                              className={`self-end inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
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
                                  <Wand2 size={20} />
                                  Generate AI Summary
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    );
                  }

                  if (meetingNotes[currentRecording.path]) {
                    return (
                      <div className="min-h-[400px]">
                        <div className="flex justify-end mb-4 gap-2">
                          <Tooltip.Provider>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const folderPath = currentRecording.path
                                      .split('/')
                                      .slice(0, -1)
                                      .join('/');
                                    const folderName =
                                      folderPath.split('/').pop() || '';
                                    const timestamp =
                                      folderName.match(/recording-(\d+)$/)?.[1];
                                    if (!timestamp) return;
                                    const transcriptPath = `${folderPath}/transcript-${timestamp}.txt`;
                                    window.electron.ipcRenderer.sendMessage(
                                      'open-transcript' as Channels,
                                      {
                                        path: transcriptPath,
                                      },
                                    );
                                  }}
                                  className={`inline-flex items-center gap-2 p-2 rounded-md transition-colors ${
                                    effectiveTheme === 'dark'
                                      ? 'hover:bg-app-dark-surface/40'
                                      : 'hover:bg-app-light-surface/40'
                                  }`}
                                >
                                  <FileText
                                    size={20}
                                    className={
                                      effectiveTheme === 'dark'
                                        ? 'text-app-dark-text-secondary'
                                        : 'text-app-light-text-secondary'
                                    }
                                  />
                                </button>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  className={`px-3 py-1.5 text-xs rounded-md shadow-lg ${
                                    effectiveTheme === 'dark'
                                      ? 'bg-app-dark-surface text-app-dark-text-primary'
                                      : 'bg-app-light-surface text-app-light-text-primary'
                                  }`}
                                  sideOffset={5}
                                >
                                  View Transcript
                                  <Tooltip.Arrow
                                    className={
                                      effectiveTheme === 'dark'
                                        ? 'fill-app-dark-surface'
                                        : 'fill-app-light-surface'
                                    }
                                  />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>

                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <button
                                  type="button"
                                  onClick={handleCopyToClipboard}
                                  className={`p-2 rounded-md transition-colors ${
                                    effectiveTheme === 'dark'
                                      ? 'hover:bg-app-dark-surface/40'
                                      : 'hover:bg-app-light-surface/40'
                                  }`}
                                >
                                  {showCopyTooltip ? (
                                    <div className="relative">
                                      <Check
                                        size={20}
                                        className="text-green-500"
                                      />
                                      <div
                                        className={`absolute bottom-full right-0 mb-2 px-2 py-1 text-xs rounded shadow-lg whitespace-nowrap ${
                                          effectiveTheme === 'dark'
                                            ? 'bg-app-dark-surface text-app-dark-text-primary'
                                            : 'bg-app-light-surface text-app-light-text-primary'
                                        }`}
                                      >
                                        Copied to clipboard!
                                      </div>
                                    </div>
                                  ) : (
                                    <Copy
                                      size={20}
                                      className={
                                        effectiveTheme === 'dark'
                                          ? 'text-app-dark-text-secondary'
                                          : 'text-app-light-text-secondary'
                                      }
                                    />
                                  )}
                                </button>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  className={`px-3 py-1.5 text-xs rounded-md shadow-lg ${
                                    effectiveTheme === 'dark'
                                      ? 'bg-app-dark-surface text-app-dark-text-primary'
                                      : 'bg-app-light-surface text-app-light-text-primary'
                                  }`}
                                  sideOffset={5}
                                >
                                  Copy Summary
                                  <Tooltip.Arrow
                                    className={
                                      effectiveTheme === 'dark'
                                        ? 'fill-app-dark-surface'
                                        : 'fill-app-light-surface'
                                    }
                                  />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        </div>
                        <div
                          className={`prose prose-sm max-w-none leading-relaxed pb-8 ${
                            effectiveTheme === 'dark'
                              ? 'text-app-dark-text-secondary/95 prose-headings:text-app-dark-text-primary prose-strong:text-app-dark-text-primary prose-li:text-app-dark-text-secondary/95 text-sm'
                              : 'text-app-light-text-secondary/95 prose-headings:text-app-light-text-primary prose-strong:text-app-light-text-primary prose-li:text-app-light-text-secondary/95 text-sm'
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
                    <div className="py-8 text-center min-h-[400px] flex flex-col">
                      {renderSummaryContent()}
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
