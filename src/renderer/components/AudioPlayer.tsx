import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  duration?: number;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function AudioPlayer({
  src,
  autoPlay = false,
  duration = 0,
}: AudioPlayerProps) {
  const { effectiveTheme } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          return true;
        })
        .catch(() => {
          setIsPlaying(false);
          return false;
        });
    }
  }, [autoPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      if (autoPlay) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            return true;
          })
          .catch(() => {
            setIsPlaying(false);
            return false;
          });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoPlay]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            return true;
          })
          .catch(() => {
            setIsPlaying(false);
            return false;
          });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div
      className={`w-full ${
        effectiveTheme === 'dark'
          ? 'text-app-dark-text-primary'
          : 'text-app-light-text-primary'
      }`}
    >
      <audio ref={audioRef} src={src}>
        <track kind="captions" src="" label="Captions" />
      </audio>

      <div
        className={`p-3 rounded-lg border ${
          effectiveTheme === 'dark'
            ? 'bg-app-dark-surface/40 border-app-dark-border/50'
            : 'bg-app-light-surface border-app-light-border'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlayPause}
            className={`p-3 rounded-full transition-colors ${
              effectiveTheme === 'dark'
                ? 'bg-app-dark-surface hover:bg-app-dark-border'
                : 'bg-app-light-surface hover:bg-app-light-border'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause
                size={20}
                className={
                  effectiveTheme === 'dark' ? 'text-white' : 'text-black'
                }
              />
            ) : (
              <Play
                size={20}
                className={
                  effectiveTheme === 'dark' ? 'text-white' : 'text-black'
                }
              />
            )}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span
              className={`text-xs ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={totalDuration || duration}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700"
            />
            <span
              className={`text-xs ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              {formatTime(totalDuration || duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
