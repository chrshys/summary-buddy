import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader, Wand2 } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { getDefaultTitle } from '../utils/dateFormatting';
import RecordButton from './RecordButton';

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
  const { effectiveTheme } = useTheme();
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('my-notes');
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const [localNotes, setLocalNotes] = useState('');
  const notesTimeoutRef = useRef<TimeoutRef>();
  const titleTimeoutRef = useRef<TimeoutRef>();
  const [isTitleEditing, setIsTitleEditing] = useState(false);

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
            <div className="flex items-center justify-center p-4">
              <p className="text-sm text-neutral-500">
                Audio player coming soon...
              </p>
            </div>
          )
        )}
      </div>

      <div className="flex-1 w-full overflow-y-auto">
        <div className="px-4">
          <div className="mb-8">
            <p
              className={`text-xs mb-3 pl-3 ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
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
