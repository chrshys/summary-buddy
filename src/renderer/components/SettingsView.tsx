import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function SettingsView() {
  const navigate = useNavigate();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [recordingsPath, setRecordingsPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      window.electron.audioRecorder.getRecordingsPath(),
      window.electron.audioRecorder.getApiKey(),
    ])
      .then(([pathResult, keyResult]) => {
        setRecordingsPath(pathResult.path);
        if (keyResult.key) setApiKey(keyResult.key);
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  const handleApiKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);

    try {
      const result = await window.electron.audioRecorder.setApiKey(newKey);
      if (result.error) {
        setError(result.error);
      } else {
        setSaveStatus('API key updated');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      setError('Failed to save API key');
    }
  };

  const handleBrowseFolder = async () => {
    const result = await window.electron.audioRecorder.browseForFolder();
    if (result.path) {
      try {
        const saveResult = await window.electron.audioRecorder.setRecordingsPath(
          result.path,
        );
        if (saveResult.error) {
          setError(saveResult.error);
        } else {
          setRecordingsPath(result.path);
          setSaveStatus('Recordings location updated');
          setTimeout(() => setSaveStatus(null), 2000);
        }
      } catch (err) {
        setError('Failed to update recordings location');
      }
    }
  };

  return (
    <div
      className={`h-screen ${
        effectiveTheme === 'dark'
          ? 'text-app-dark-text-primary bg-app-dark-bg'
          : 'text-app-light-text-primary bg-app-light-bg'
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${
          effectiveTheme === 'dark'
            ? 'bg-app-dark-surface/50 border-app-dark-border'
            : 'bg-app-light-surface/50 border-app-light-border'
        } window-drag`}
      >
        <div className="flex items-center">
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
            Settings
          </div>
        </div>
      </div>

      <div className="p-3">
        <div
          className={`p-3 space-y-4 border rounded-lg ${
            effectiveTheme === 'dark'
              ? 'bg-app-dark-surface/50 border-app-dark-border'
              : 'bg-app-light-surface border-app-light-border'
          }`}
        >
          <div>
            <label
              htmlFor="openaiApiKey"
              className={`block text-xs mb-1.5 ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              OpenAI API Key
              <input
                type="password"
                id="openaiApiKey"
                value={apiKey}
                onChange={handleApiKeyChange}
                className={`w-full mt-1.5 px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  effectiveTheme === 'dark'
                    ? 'bg-app-dark-bg border-app-dark-border placeholder-app-dark-text-tertiary'
                    : 'bg-white border-app-light-border placeholder-app-light-text-tertiary'
                }`}
                placeholder="sk-..."
              />
            </label>
          </div>

          <div>
            <label
              htmlFor="recordingsPath"
              className={`block text-xs mb-1.5 ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              Recordings Location
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  id="recordingsPath"
                  value={recordingsPath}
                  readOnly
                  className={`flex-1 px-2 py-1.5 text-sm border rounded-md ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-bg border-app-dark-border'
                      : 'bg-white border-app-light-border'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    effectiveTheme === 'dark'
                      ? 'bg-app-dark-surface hover:bg-app-dark-border text-app-dark-text-primary'
                      : 'bg-app-light-surface hover:bg-app-light-border text-app-light-text-primary'
                  }`}
                >
                  Browse
                </button>
              </div>
            </label>
          </div>

          <div>
            <label
              className={`block text-xs mb-1.5 ${
                effectiveTheme === 'dark'
                  ? 'text-app-dark-text-secondary'
                  : 'text-app-light-text-secondary'
              }`}
            >
              Theme
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    theme === 'system'
                      ? effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary'
                        : 'bg-app-light-surface text-app-light-text-primary'
                      : effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface/50'
                      : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
                  }`}
                >
                  <Monitor size={16} />
                  System
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    theme === 'light'
                      ? effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary'
                        : 'bg-app-light-surface text-app-light-text-primary'
                      : effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface/50'
                      : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
                  }`}
                >
                  <Sun size={16} />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    theme === 'dark'
                      ? effectiveTheme === 'dark'
                        ? 'bg-app-dark-surface text-app-dark-text-primary'
                        : 'bg-app-light-surface text-app-light-text-primary'
                      : effectiveTheme === 'dark'
                      ? 'text-app-dark-text-secondary hover:text-app-dark-text-primary hover:bg-app-dark-surface/50'
                      : 'text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface'
                  }`}
                >
                  <Moon size={16} />
                  Dark
                </button>
              </div>
            </label>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
          {saveStatus && (
            <div
              className={`text-sm ${
                effectiveTheme === 'dark'
                  ? 'text-green-400'
                  : 'text-green-600'
              }`}
            >
              {saveStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
