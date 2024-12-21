import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AudioPlayerProps {
  src: string;
  onPlaybackComplete?: () => void;
  autoPlay?: boolean;
}

export default function AudioPlayer({ src, onPlaybackComplete, autoPlay = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const fileUrl = `file://${src}`;
    console.log('Loading audio from:', fileUrl);
    audio.src = fileUrl;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onPlaybackComplete?.();
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e);
      console.error('Audio element error:', audio.error);
      console.error('Attempted to load URL:', fileUrl);
      setError(`Failed to load audio file: ${audio.error?.message || 'Unknown error'}`);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, [onPlaybackComplete, src, autoPlay]);

  useEffect(() => {
    setError(null);
  }, [src]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.error('Error playing audio:', e);
          setError('Failed to play audio');
        });
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const formatTime = useCallback((timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  if (error) {
    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border ${
          effectiveTheme === 'dark'
            ? 'bg-red-900/20 border-red-900/50 text-red-400'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}
      >
        <AlertCircle size={20} />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 p-2 rounded-lg border w-[280px] mx-auto ${
        effectiveTheme === 'dark'
          ? 'bg-app-dark-surface/40 border-app-dark-border/50'
          : 'bg-app-light-surface border-app-light-border'
      }`}
    >
      <audio ref={audioRef} />
      
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={togglePlayPause}
          className={`p-1 rounded-md transition-colors ${
            effectiveTheme === 'dark'
              ? 'hover:bg-app-dark-border'
              : 'hover:bg-app-light-border'
          }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="flex items-center flex-1 gap-2">
          <span className="text-xs tabular-nums">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <span className="text-xs tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
} 