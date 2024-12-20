import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Pin, Folder } from 'lucide-react';
import RecordButton from './RecordButton';
import RecordingsList from './RecordingsList';
import { Recording } from '../types/recording';
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

function MainView() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const resolvedTheme = resolveTheme(theme);
  const [isRecording, setIsRecording] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>(
    {},
  );
  const [isTranscribing, setIsTranscribing] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isRecording) {
      setElapsedTime(0);
      intervalId = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
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
        setRecordings((prev) => [{ ...recording, isActive: true }, ...prev]);
      },
    );

    const recordingStoppedUnsubscribe = window.electron.ipcRenderer.on(
      'recording-stopped',
      ({ path }) => {
        setRecordings((prev) =>
          prev.map((rec) =>
            rec.path === path ? { ...rec, isActive: false } : rec,
          ),
        );
      },
    );

    return () => {
      recordingStartedUnsubscribe();
      recordingStoppedUnsubscribe();
    };
  }, []);

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

  const handleTranscribe = async (recording: Recording): Promise<void> => {
    try {
      setIsTranscribing({ ...isTranscribing, [recording.path]: true });
      const result = await window.electron.audioRecorder.transcribeRecording(
        recording.path,
      );

      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        setTranscriptions({ ...transcriptions, [recording.path]: result.text });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to transcribe recording';
      setError(errorMessage);
    } finally {
      setIsTranscribing({ ...isTranscribing, [recording.path]: false });
    }
  };

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
        <div
          className={`text-sm font-medium ${
            resolvedTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
          }`}
        >
          Summary Buddy
        </div>
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
            onTranscribe={handleTranscribe}
            onStopRecording={isRecording ? toggleRecording : undefined}
            elapsedTime={elapsedTime}
            isTranscribing={isTranscribing}
            transcriptions={transcriptions}
          />
        </div>
      </div>
    </div>
  );
}

export default MainView;
