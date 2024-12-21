import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Settings, Pin, Folder, ArrowLeft } from 'lucide-react';
import RecordButton from './RecordButton';
import RecordingsList from './RecordingsList';
import RecordingView from './RecordingView';
import type { Recording } from '../types/recording';
import { useTheme } from '../contexts/ThemeContext';
import { resolveTheme } from '../utils/theme';

// Add formatTime utility function

function getButtonClasses(isPinned: boolean, theme: 'light' | 'dark'): string {
  if (isPinned) {
    return 'text-blue-600';
  }

  return theme === 'dark'
    ? 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100';
}

export default function MainView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const resolvedTheme = resolveTheme(theme);
  const [isRecording, setIsRecording] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});
  const [isGeneratingNotes, setIsGeneratingNotes] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isRecording) {
      setElapsedTime(0);
      intervalId = setInterval(() => {
        setElapsedTime((prev) => {
          if (prev === 1500) {
            setError(
              'Recording will automatically stop in 3 minutes due to size limitations',
            );
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Load initial state
    Promise.all([
      window.electron.audioRecorder.getRecordingsPath(),
      window.electron.audioRecorder.getPinnedState(),
    ])
      .then(([, pinnedResult]) => {
        if (!pinnedResult.error) {
          setIsPinned(pinnedResult.isPinned);
        }
        return pinnedResult;
      })
      .catch(() => {
        setError('Failed to load initial state');
      });
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'audio-level',
      (level) => {
        if (typeof level === 'number') {
          setAudioLevel(level);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const result = await window.electron.audioRecorder.listRecordings();
        if (result.error) {
          setError(result.error);
        } else {
          setRecordings(result.recordings);
        }
      } catch (err) {
        setError('Failed to load recordings');
      }
    };

    loadRecordings();
  }, [isRecording]);

  // Add listeners for recording events
  useEffect(() => {
    const recordingStartedUnsubscribe = window.electron.ipcRenderer.on(
      'recording-started',
      (recording: Recording) => {
        setRecordings((prev) => {
          const newRecordings = [{ ...recording, isActive: true }, ...prev];
          navigate(`/recording/${encodeURIComponent(recording.path)}`);
          return newRecordings;
        });
      },
    );

    const recordingStoppedUnsubscribe = window.electron.ipcRenderer.on(
      'recording-stopped',
      ({ path: recordingPath }) => {
        setRecordings((prev) =>
          prev.map((rec) =>
            rec.path === recordingPath ? { ...rec, isActive: false } : rec,
          ),
        );
      },
    );

    return () => {
      recordingStartedUnsubscribe();
      recordingStoppedUnsubscribe();
    };
  }, [navigate]);

  const toggleRecording = async (): Promise<void> => {
    try {
      if (isRecording) {
        const result = await window.electron.audioRecorder.stopRecording();
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await window.electron.audioRecorder.startRecording();
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setIsRecording(!isRecording);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';

      setError(errorMessage);
      setIsRecording(false);
    }
  };

  const togglePin = async (): Promise<void> => {
    try {
      const newPinState = !isPinned;
      const result =
        await window.electron.audioRecorder.setAlwaysOnTop(newPinState);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsPinned(newPinState);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';

      setError(errorMessage);
    }
  };

  const handlePlayRecording = async (recording: Recording): Promise<void> => {
    try {
      const result = await window.electron.audioRecorder.playRecording(
        recording.path,
      );
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to play recording';
      setError(errorMessage);
    }
  };

  const handleDeleteRecording = async (recording: Recording): Promise<void> => {
    try {
      const result = await window.electron.audioRecorder.deleteRecording(
        recording.path,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      // Remove the deleted recording from the state
      setRecordings((prev) =>
        prev.filter((rec) => rec.path !== recording.path),
      );
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete recording';
      setError(errorMessage);
    }
  };

  const openRecordingsFolder = () => {
    window.electron.audioRecorder.openRecordingsFolder();
  };

  // Add theme change listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force a re-render when system theme changes
      if (theme === 'system') {
        // Using a state update to force re-render
        setError((prev) => prev);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleGenerateNotes = async (recording: Recording) => {
    try {
      setIsGeneratingNotes((prev) => ({
        ...prev,
        [recording.path]: true,
      }));

      const result = await window.electron.createSummary(recording.path);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.notes) {
        setMeetingNotes((prev) => ({
          ...prev,
          [recording.path]: result.notes!,
        }));
      }
    } catch (err) {
      setError('Failed to generate notes');
    } finally {
      setIsGeneratingNotes((prev) => ({
        ...prev,
        [recording.path]: false,
      }));
    }
  };

  const handleUpdateTitle = useCallback(
    async (recording: Recording, newTitle: string) => {
      try {
        // Update the recording title in the recordings array first
        const updatedRecordings = recordings.map((r) =>
          r.path === recording.path ? { ...r, title: newTitle } : r,
        );
        setRecordings(updatedRecordings);

        // Then save to the metadata file
        await window.electron.audioRecorder.updateRecordingTitle(
          recording.path,
          newTitle,
        );
      } catch (err) {
        // Revert the title change in case of error
        setRecordings(recordings);
        setError('Failed to update recording title');
      }
    },
    [recordings],
  );

  const renderTitleBar = () => {
    if (location.pathname.startsWith('/recording/')) {
      return (
        <>
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`p-1.5 mr-2 transition-colors rounded-md ${
              resolvedTheme === 'dark'
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <ArrowLeft size={16} />
          </button>
          <div
            className={`text-sm font-medium ${
              resolvedTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}
          >
            Recording Details
          </div>
        </>
      );
    }

    return (
      <div
        className={`text-sm font-medium ${
          resolvedTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
        }`}
      >
        Summary Buddy
      </div>
    );
  };

  useEffect(() => {
    const recordingErrorUnsubscribe = window.electron.ipcRenderer.on(
      'recording-error',
      (errorMessage: string) => {
        setError(errorMessage);
        setIsRecording(false);
        setElapsedTime(0);
      },
    );

    return () => {
      recordingErrorUnsubscribe();
    };
  }, []);

  // Add useEffect to listen for generated notes
  useEffect(() => {
    window.electron.onNotesGenerated(({ path, notes }) => {
      setMeetingNotes((prev) => ({
        ...prev,
        [path]: notes,
      }));
      setIsGeneratingNotes((prev) => ({
        ...prev,
        [path]: false,
      }));
    });
  }, []);

  return (
    <div
      className={`h-screen ${
        resolvedTheme === 'dark'
          ? 'text-white bg-neutral-900'
          : 'text-neutral-900 bg-white'
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b ${
          resolvedTheme === 'dark'
            ? 'bg-neutral-800/50 border-neutral-700'
            : 'bg-white/50 border-neutral-200'
        } window-drag`}
      >
        <div className="flex items-center">{renderTitleBar()}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openRecordingsFolder}
            className={`p-1.5 transition-colors rounded-md ${getButtonClasses(
              false,
              resolvedTheme,
            )}`}
            aria-label="Open Recordings Folder"
          >
            <Folder size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`p-1.5 transition-colors rounded-md ${getButtonClasses(
              false,
              resolvedTheme,
            )}`}
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={togglePin}
            className={`p-1.5 transition-colors rounded-md ${getButtonClasses(
              isPinned,
              resolvedTheme,
            )}`}
            aria-label={isPinned ? 'Unpin Window' : 'Pin Window'}
          >
            <Pin size={16} />
          </button>
        </div>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <div className="flex flex-col items-center h-[calc(100vh-36px)]">
              <div className="flex flex-col items-center justify-center min-h-[180px] pt-2">
                <RecordButton
                  isRecording={isRecording}
                  audioLevel={audioLevel}
                  elapsedTime={elapsedTime}
                  onToggleRecording={toggleRecording}
                />
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              </div>

              <div className="flex-1 w-full overflow-y-auto">
                <RecordingsList
                  recordings={recordings}
                  onPlay={handlePlayRecording}
                  onDelete={handleDeleteRecording}
                  onStopRecording={isRecording ? toggleRecording : undefined}
                  elapsedTime={elapsedTime}
                />
              </div>
            </div>
          }
        />
        <Route
          path="/recording/:recordingPath"
          element={
            <RecordingView
              recordings={recordings}
              onPlay={handlePlayRecording}
              onGenerateNotes={handleGenerateNotes}
              onUpdateTitle={handleUpdateTitle}
              isGeneratingNotes={isGeneratingNotes}
              meetingNotes={meetingNotes}
              isRecording={isRecording}
              elapsedTime={elapsedTime}
              onStopRecording={toggleRecording}
              audioLevel={audioLevel}
            />
          }
        />
      </Routes>
    </div>
  );
}
