/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import fs from 'fs';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Tray,
  screen,
  nativeImage,
  dialog,
  desktopCapturer,
  NativeImage,
  protocol,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as mm from 'music-metadata';
import CoreAudioRecorder from './audio/coreaudio';
import { resolveHtmlPath } from './util';
import { RecordingMetadataStore } from './audio/RecordingMetadata';
import DiarizationService from './services/diarization';

// Utility functions
function checkMetadataExists(metadataPath: string): boolean {
  try {
    fs.accessSync(metadataPath);
    return true;
  } catch {
    return false;
  }
}

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// Move these functions to the top of the file, after the variable declarations
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let audioRecorder: CoreAudioRecorder | null = null;
let isPinned = false;
let audioLevelInterval: ReturnType<typeof setInterval> | null = null;
let durationInterval: ReturnType<typeof setInterval> | null = null;
let normalTrayIcon: NativeImage | null = null;
let recordingTrayIcon: NativeImage | null = null;
let diarizationService: DiarizationService | null = null;

// Add the audio level functions here, before they're used
function startAudioLevelUpdates(window: BrowserWindow) {
  if (audioLevelInterval) {
    clearInterval(audioLevelInterval);
  }
  audioLevelInterval = setInterval(() => {
    if (audioRecorder) {
      const level = audioRecorder.getAudioLevel();
      if (typeof level === 'number' && !window.isDestroyed()) {
        window.webContents.send('audio-level', level);
      }
    }
  }, 16); // ~60fps update rate
}

function stopAudioLevelUpdates() {
  if (audioLevelInterval) {
    clearInterval(audioLevelInterval);
    audioLevelInterval = null;
  }
}

// Move these function declarations to the top as well
function setRecordingState(isRecording: boolean) {
  if (!tray || !normalTrayIcon || !recordingTrayIcon) return;
  tray.setImage(isRecording ? recordingTrayIcon : normalTrayIcon);
}

function createTrayIcon(getAssetPath: (...paths: string[]) => string) {
  try {
    const iconPath =
      process.platform === 'darwin'
        ? getAssetPath('trayTemplate.png')
        : getAssetPath('tray.png');

    const icon = nativeImage.createFromPath(iconPath);

    // Resize to appropriate size for platform
    const size = process.platform === 'darwin' ? 22 : 16;
    normalTrayIcon = icon.resize({ width: size, height: size });

    // For macOS, mark as template image
    if (process.platform === 'darwin') {
      normalTrayIcon.setTemplateImage(true);
    }

    // Create recording state icon
    const recordingIconPath =
      process.platform === 'darwin'
        ? getAssetPath('trayRecordingTemplate.png')
        : getAssetPath('trayRecording.png');

    const recordingIcon = nativeImage.createFromPath(recordingIconPath);
    recordingTrayIcon = recordingIcon.resize({ width: size, height: size });

    if (process.platform === 'darwin') {
      recordingTrayIcon.setTemplateImage(true);
    }

    // Create or update tray
    if (tray) {
      tray.destroy();
    }
    tray = new Tray(normalTrayIcon);
    tray.setToolTip('Audio Recorder');
  } catch (error) {
    console.error('Error creating tray icon:', error);
  }
}

// Load pinned state from config
async function loadPinnedState() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.isPinned || false;
    }
  } catch (error) {
    console.error('Error loading pinned state:', error);
  }
  return false;
}

// Save pinned state to config
async function savePinnedState(pinned: boolean) {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : {};

    config.isPinned = pinned;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving pinned state:', error);
  }
}

// Add these functions before createWindow
async function saveWindowPosition(window: BrowserWindow) {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : {};

    const bounds = window.getBounds();
    config.windowPosition = bounds;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving window position:', error);
  }
}

async function loadWindowPosition(): Promise<{ x: number; y: number } | null> {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.windowPosition || null;
    }
  } catch (error) {
    console.error('Error loading window position:', error);
  }
  return null;
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  // Load pinned state before creating window
  isPinned = await loadPinnedState();
  const savedPosition = await loadWindowPosition();

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 320,
    height: 600,
    ...(savedPosition && { x: savedPosition.x, y: savedPosition.y }),
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Initialize pinned state
  mainWindow.setAlwaysOnTop(isPinned, 'floating');

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // Hide the window when it loses focus
  mainWindow.on('blur', () => {
    if (!mainWindow?.webContents.isDevToolsOpened() && !isPinned) {
      mainWindow?.hide();
    }
  });

  // Save position when window is moved while pinned
  mainWindow.on('moved', () => {
    if (mainWindow && isPinned) {
      saveWindowPosition(mainWindow);
    }
  });

  // Save position before closing
  mainWindow.on('close', () => {
    if (mainWindow && isPinned) {
      saveWindowPosition(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create the tray icon - pass getAssetPath
  createTrayIcon(getAssetPath);

  // Add click handler to toggle the window
  tray?.on('click', () => {
    if (!mainWindow) return;

    // If window is visible, hide it
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    // Get window size
    const { width: windowWidth, height: windowHeight } = mainWindow.getBounds();

    // Get display with cursor
    const { width: screenWidth, height: screenHeight } =
      screen.getPrimaryDisplay().workAreaSize;

    // Get tray icon position
    const trayBounds = tray?.getBounds();

    if (!trayBounds) return;

    // Calculate x position
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2);

    // Calculate y position
    let y = Math.round(trayBounds.y + trayBounds.height);

    // Make sure window is not displayed outside screen bounds
    if (x + windowWidth > screenWidth) {
      x = screenWidth - windowWidth;
    }
    if (x < 0) {
      x = 0;
    }
    if (y + windowHeight > screenHeight) {
      y = trayBounds.y - windowHeight;
    }

    mainWindow.setPosition(x, y);
    mainWindow.show();
  });

  // Remove default menu
  mainWindow.removeMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// Get recordings directory path helper function
async function getRecordingsPath() {
  const defaultPath = path.join(app.getPath('desktop'), 'Recordings');
  let recordingsPath;

  try {
    // Try to read the saved path from userData
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      recordingsPath = config.recordingsPath;
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }

  // Use default path if no saved path exists
  recordingsPath = recordingsPath || defaultPath;

  // Ensure the directory exists
  fs.mkdirSync(recordingsPath, { recursive: true });
  return recordingsPath;
}

// Get API key
ipcMain.handle(
  'get-api-key',
  async (_, provider: 'openai' | 'assemblyai' = 'openai') => {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { key: config[`${provider}ApiKey`] || null };
      }
      return { key: null };
    } catch (error) {
      console.error('Error reading API key:', error);
      return { error: 'Failed to read API key' };
    }
  },
);

// Set API key
ipcMain.handle(
  'set-api-key',
  async (_, key: string, provider: 'openai' | 'assemblyai' = 'openai') => {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      const config = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
        : {};

      config[`${provider}ApiKey`] = key;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving API key:', error);
      return { error: 'Failed to save API key' };
    }
  },
);

// Add setAlwaysOnTop handler
ipcMain.handle('set-always-on-top', async (_event, shouldPin: boolean) => {
  try {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return { error: 'No active window found' };
    }

    window.setAlwaysOnTop(shouldPin, 'floating');
    isPinned = shouldPin;
    await savePinnedState(shouldPin);
    return { success: true };
  } catch (error) {
    return { error: 'Failed to set window state' };
  }
});

// Add this helper function near the top with other utility functions
async function createRecordingFolder(timestamp: number): Promise<string> {
  const recordingsDir = await getRecordingsPath();
  const folderName = `recording-${timestamp}`;
  const folderPath = path.join(recordingsDir, folderName);
  fs.mkdirSync(folderPath, { recursive: true });
  return folderPath;
}

// First, update the metadata type definition and move it before usage
type RecordingMetadata = {
  title?: string;
  duration: number;
  transcriptionId?: string;
  lastModified: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
};

// Move updateRecordingMetadata function before start-recording handler
async function updateRecordingMetadata(
  folderPath: string,
  updates: Partial<RecordingMetadata>,
) {
  try {
    const metadataPath = path.join(folderPath, 'metadata.json');
    let metadata = {};

    // Try to read existing metadata
    try {
      const existingMetadata = fs.readFileSync(metadataPath, 'utf8');
      metadata = JSON.parse(existingMetadata);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty metadata
    }

    // Update metadata with new values
    metadata = {
      ...metadata,
      ...updates,
      lastModified: new Date().toISOString(),
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error updating metadata:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update metadata',
    };
  }
}

// Update the start-recording handler
ipcMain.handle('start-recording', async () => {
  try {
    if (!audioRecorder) {
      audioRecorder = new CoreAudioRecorder();
    }

    const timestamp = Date.now();
    const folderPath = await createRecordingFolder(timestamp);
    const outputPath = path.join(folderPath, `recording-${timestamp}.mp3`);

    // Create initial metadata file
    await updateRecordingMetadata(folderPath, {
      startTime: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      duration: 0,
      isActive: true,
    });

    // Start tracking metadata
    RecordingMetadataStore.startRecording(outputPath);

    const result = await audioRecorder.startRecording(outputPath);
    if (result.error) {
      return { error: result.error };
    }

    // Start audio level updates
    if (mainWindow) {
      startAudioLevelUpdates(mainWindow);
    }

    // Send initial recording info to renderer
    mainWindow?.webContents.send('recording-started', {
      name: path.basename(folderPath),
      path: outputPath,
      date: new Date().toISOString(),
      duration: 0,
      isActive: true,
    });

    // Start duration update interval
    const startTime = Date.now();
    if (durationInterval) {
      clearInterval(durationInterval);
    }
    durationInterval = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      mainWindow?.webContents.send('recording-duration-update', {
        path: outputPath,
        duration,
      });
    }, 1000);

    setRecordingState(true);
    return { success: true, outputPath };
  } catch (error) {
    console.error('Error starting recording:', error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error occurred while starting recording' };
  }
});

// Add this function to get recording duration from file metadata
async function getRecordingDuration(filePath: string): Promise<number> {
  try {
    // First try to get duration from metadata file
    const metadataPath = `${filePath}.meta`;
    if (checkMetadataExists(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (metadata.duration) {
        console.log(
          `Got duration ${metadata.duration} from metadata file for ${filePath}`,
        );
        return metadata.duration;
      }
    }

    // Fallback: Get duration from the audio file itself
    try {
      const metadata = await mm.parseFile(filePath);
      const duration = Math.floor(metadata.format.duration || 0);
      console.log(`Got duration ${duration} from audio file ${filePath}`);
      return duration;
    } catch (audioError) {
      console.error('Error reading audio file duration:', audioError);
      return 0;
    }
  } catch (error) {
    console.error('Error reading recording duration:', error);
    return 0;
  }
}

// Update the stop-recording handler
ipcMain.handle('stop-recording', async () => {
  try {
    if (!audioRecorder) {
      return { error: 'No recording in progress' };
    }

    // Stop audio level updates
    stopAudioLevelUpdates();

    const result = await audioRecorder.stopRecording();
    if (result.error) {
      return { error: result.error };
    }

    const recordingPath = audioRecorder.getCurrentRecordingPath();
    const folderPath = path.dirname(recordingPath);
    const duration = Math.floor(
      (Date.now() - RecordingMetadataStore.getStartTime(recordingPath)) / 1000,
    );

    // If duration is 0, delete the recording folder
    if (duration === 0) {
      try {
        fs.rmSync(folderPath, { recursive: true });
        return { success: true, duration: 0 };
      } catch (err) {
        console.error('Error deleting zero-duration recording:', err);
      }
    }

    // Update metadata when stopping
    await updateRecordingMetadata(folderPath, {
      duration,
      isActive: false,
      endTime: new Date().toISOString(),
    });

    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    mainWindow?.webContents.send('recording-stopped', { path: recordingPath });

    setRecordingState(false);
    return { success: true, duration };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Get recordings directory path
ipcMain.handle('get-recordings-path', async () => {
  const recordingsPath = await getRecordingsPath();
  return { path: recordingsPath };
});

// Set recordings directory path
ipcMain.handle('set-recordings-path', async (_, newPath: string) => {
  try {
    // Create the directory if it doesn't exist
    fs.mkdirSync(newPath, { recursive: true });

    // Save the path to config
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
      : {};

    config.recordingsPath = newPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { success: true };
  } catch (error) {
    console.error('Error setting recordings path:', error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Unknown error occurred while setting recordings path' };
  }
});

// Browse for folder
ipcMain.handle('browse-for-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Recordings Location',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { path: result.filePaths[0] };
  }
  return { path: null };
});

// Open recordings folder in system file explorer
ipcMain.handle('open-recordings-folder', async () => {
  const recordingsDir = await getRecordingsPath();
  await shell.openPath(recordingsDir);
});

// Update cleanup function for old recordings (older than 7 days)
async function cleanupOldRecordings() {
  try {
    const recordingsDir = await getRecordingsPath();
    const folders = fs.readdirSync(recordingsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    await Promise.all(
      folders
        .filter((folder) => folder.startsWith('recording-'))
        .map(async (folder) => {
          try {
            const folderPath = path.join(recordingsDir, folder);
            const stats = fs.lstatSync(folderPath);

            // Skip if not a directory
            if (!stats.isDirectory()) {
              return;
            }

            const age = now - stats.mtimeMs;

            if (age > maxAge) {
              fs.rmSync(folderPath, { recursive: true });
              console.log(`Deleted old recording folder: ${folder}`);
            }
          } catch (err) {
            console.error(`Error processing folder ${folder}:`, err);
          }
        }),
    );
  } catch (error) {
    console.error('Error cleaning up old recordings:', error);
  }
}

// Add migration code for existing recordings
async function migrateExistingRecordings() {
  try {
    const recordingsDir = await getRecordingsPath();
    const files = fs.readdirSync(recordingsDir);

    // Find all .mp3 files that aren't in a recording folder
    const oldRecordings = files.filter(
      (file) =>
        file.endsWith('.mp3') &&
        file.startsWith('recording-') &&
        !file.includes(path.sep),
    );

    await Promise.all(
      oldRecordings.map(async (oldFile) => {
        try {
          const oldPath = path.join(recordingsDir, oldFile);
          const timestamp = oldFile.match(/recording-(\d+)\.mp3$/)?.[1];

          if (!timestamp) {
            return;
          }

          // Create new folder
          const folderPath = await createRecordingFolder(
            parseInt(timestamp, 10),
          );
          const newPath = path.join(folderPath, `recording-${timestamp}.mp3`);

          // Move recording file
          fs.renameSync(oldPath, newPath);

          // Move metadata if it exists
          const oldMetaPath = `${oldPath}.meta`;
          if (fs.existsSync(oldMetaPath)) {
            const metadata = JSON.parse(fs.readFileSync(oldMetaPath, 'utf8'));
            await updateRecordingMetadata(folderPath, metadata);
            fs.unlinkSync(oldMetaPath);
          }

          console.log(`Migrated recording: ${oldFile}`);
        } catch (err) {
          console.error(`Failed to migrate recording ${oldFile}:`, err);
        }
      }),
    );
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Register protocol handler before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'file',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

// Register file protocol handler
const registerFileProtocol = () => {
  protocol.registerFileProtocol('file', (request, callback) => {
    try {
      let filePath = decodeURIComponent(request.url.replace('file://', ''));
      // Handle Windows paths
      if (process.platform === 'win32') {
        // Remove leading slash
        filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        // Convert forward slashes to backslashes
        filePath = filePath.replace(/\//g, '\\');
      } else if (process.platform === 'darwin' && filePath.startsWith('/')) {
        // On macOS, remove the extra leading slash
        filePath = filePath.slice(1);
      }

      callback({ path: filePath });
    } catch (error) {
      console.error('Protocol error:', error);
      callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
    }
  });
};

// Handle app initialization
app
  .whenReady()
  .then(async () => {
    registerFileProtocol();
    await migrateExistingRecordings();
    cleanupOldRecordings();
    setInterval(cleanupOldRecordings, 24 * 60 * 60 * 1000);
    createWindow();

    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.error);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopAudioLevelUpdates();
  if (mainWindow && isPinned) {
    saveWindowPosition(mainWindow);
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Add a handler for app quit to ensure position is saved
app.on('before-quit', () => {
  if (mainWindow && isPinned) {
    saveWindowPosition(mainWindow);
  }
});

// Get pinned state
ipcMain.handle('get-pinned-state', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { isPinned: config.isPinned || false };
    }
    return { isPinned: false };
  } catch (error) {
    console.error('Error reading pinned state:', error);
    return { error: 'Failed to read pinned state' };
  }
});

// Add this near your other IPC handlers
ipcMain.handle('get-system-audio-source', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: false,
    });
    const systemAudioSource = sources.find((source) =>
      source.id.toLowerCase().includes('system audio'),
    );
    return { sourceId: systemAudioSource?.id };
  } catch (error) {
    return { error: 'Failed to get system audio source' };
  }
});

// Modify the list-recordings handler to look for timestamped files
ipcMain.handle('list-recordings', async () => {
  try {
    const recordingsDir = await getRecordingsPath();
    const folders = fs.readdirSync(recordingsDir);
    const recordings = await Promise.all(
      folders
        .filter((folder) => folder.startsWith('recording-'))
        .map(async (folder) => {
          const folderPath = path.join(recordingsDir, folder);
          const stats = fs.lstatSync(folderPath);
          if (!stats.isDirectory()) return null;

          const folderTimestamp = folder.match(/recording-(\d+)$/)?.[1];
          if (!folderTimestamp) return null;

          const recordingPath = path.join(
            folderPath,
            `recording-${folderTimestamp}.mp3`,
          );
          if (!fs.existsSync(recordingPath)) return null;

          const recordingStats = fs.lstatSync(recordingPath);
          const match = folder.match(/recording-(\d+)$/);
          const timestamp = match
            ? parseInt(match[1], 10)
            : recordingStats.mtimeMs;
          const duration = await getRecordingDuration(recordingPath);

          // If duration is 0, delete the folder and its contents
          if (duration === 0) {
            try {
              fs.rmSync(folderPath, { recursive: true });
              return null;
            } catch (err) {
              console.error(
                `Failed to delete zero-duration recording folder: ${folderPath}`,
                err,
              );
            }
          }

          // Check for existing notes and AI summary
          let customTitle = null;
          let hasAiSummary = false;
          let manualNotes = '';
          let aiNotes = '';

          try {
            // Check metadata for title
            const metadataPath = path.join(folderPath, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
              const metadata = JSON.parse(
                fs.readFileSync(metadataPath, 'utf8'),
              );
              customTitle = metadata.title || null;
            }

            // Check for AI summary
            const aiNotesPath = path.join(
              folderPath,
              `notes-${folderTimestamp}.txt`,
            );
            if (fs.existsSync(aiNotesPath)) {
              hasAiSummary = true;
              aiNotes = fs.readFileSync(aiNotesPath, 'utf8');
            }

            // Check for manual notes
            const manualNotesPath = path.join(
              folderPath,
              `manual-notes-${folderTimestamp}.txt`,
            );
            if (fs.existsSync(manualNotesPath)) {
              manualNotes = fs.readFileSync(manualNotesPath, 'utf8');
            }
          } catch (err) {
            // Ignore metadata read errors
            console.error('Error reading metadata or notes:', err);
          }

          return {
            name: folder,
            path: recordingPath,
            date: new Date(timestamp).toISOString(),
            duration,
            title: customTitle,
            hasAiSummary,
            manualNotes,
            aiNotes,
          };
        }),
    );

    // Filter out null entries (deleted recordings) and sort by date
    const validRecordings = recordings
      .filter((rec): rec is NonNullable<typeof rec> => rec !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { recordings: validRecordings };
  } catch (error) {
    console.error('Error listing recordings:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to list recordings',
      recordings: [],
    };
  }
});

// Add play recording handler
ipcMain.handle('play-recording', async (_, filePath: string) => {
  try {
    // Just verify the file exists
    fs.accessSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error accessing recording:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to access recording',
    };
  }
});

// Update delete recording handler to remove the entire folder
ipcMain.handle('delete-recording', async (_, filePath: string) => {
  try {
    // Get the folder path from the recording file path
    const folderPath = path.dirname(filePath);

    // Verify this is a recording folder before deleting
    if (!path.basename(folderPath).startsWith('recording-')) {
      return { error: 'Invalid recording path' };
    }

    // Delete the entire folder and its contents
    fs.rmSync(folderPath, { recursive: true });

    return { success: true };
  } catch (error) {
    console.error('Error deleting recording:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to delete recording',
    };
  }
});

// Modify the transcribe-recording handler to include timestamp in file name
ipcMain.handle('transcribe-recording', async (_, filePath: string) => {
  try {
    // Get API keys from config
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.assemblyaiApiKey) {
      return {
        error: 'AssemblyAI API key not found. Please add it in settings.',
      };
    }

    // Initialize diarization service if needed
    if (!diarizationService) {
      diarizationService = new DiarizationService(config.assemblyaiApiKey);
    }

    // Get timestamp from folder name
    const folderName = path.basename(path.dirname(filePath));
    const timestamp = folderName.match(/recording-(\d+)$/)?.[1];

    if (!timestamp) {
      return { error: 'Invalid recording folder structure' };
    }

    const folderPath = path.dirname(filePath);
    const transcriptionPath = path.join(
      folderPath,
      `transcript-${timestamp}.txt`,
    );

    // Transcribe the audio with speaker diarization
    const result = await diarizationService.transcribeAudio(filePath);

    if (result.error) {
      return { error: result.error };
    }

    // Format and save the transcription
    const formattedTranscript = result.segments
      .map((segment) => `[${segment.speaker}]: ${segment.text}`)
      .join('\n');

    fs.writeFileSync(transcriptionPath, formattedTranscript);

    return {
      success: true,
      text: formattedTranscript,
      segments: result.segments,
    };
  } catch (error) {
    console.error('Error during transcription:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during transcription',
    };
  }
});

// Modify the create-summary handler to include timestamp in file names
ipcMain.handle('create-summary', async (_, filePath: string) => {
  try {
    // Get API keys from config
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.assemblyaiApiKey) {
      return {
        error: 'AssemblyAI API key not found. Please add it in settings.',
      };
    }

    // Initialize diarization service if needed
    if (!diarizationService) {
      diarizationService = new DiarizationService(config.assemblyaiApiKey);
    }

    // Ensure diarizationService is initialized
    if (!diarizationService) {
      return { error: 'Failed to initialize diarization service' };
    }

    // Get timestamp from folder name
    const folderName = path.basename(path.dirname(filePath));
    const timestamp = folderName.match(/recording-(\d+)$/)?.[1];

    if (!timestamp) {
      return { error: 'Invalid recording folder structure' };
    }

    const folderPath = path.dirname(filePath);
    const notesPath = path.join(folderPath, `notes-${timestamp}.txt`);

    // Generate notes
    const result = await diarizationService.createSummary(filePath);
    if (result.error) {
      return { error: result.error };
    }

    // Save notes
    if (result.notes) {
      fs.writeFileSync(notesPath, result.notes);
    }

    return {
      success: true,
      notes: result.notes,
    };
  } catch (error) {
    console.error('Error generating notes:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during notes generation',
    };
  }
});

// Update the create-action-items handler to use notes
ipcMain.handle('create-action-items', async (_, filePath: string) => {
  try {
    // Get API keys from config
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.assemblyaiApiKey) {
      return {
        error: 'AssemblyAI API key not found. Please add it in settings.',
      };
    }

    // Initialize diarization service if needed
    if (!diarizationService) {
      diarizationService = new DiarizationService(config.assemblyaiApiKey);
    }

    // Generate notes using the combined summary method
    const result = await diarizationService.createSummary(filePath);
    console.log('Notes result:', result);

    if (result.error) {
      console.error('Notes error:', result.error);
      return { error: result.error };
    }

    // Save notes alongside the audio file
    const notesPath = `${filePath}.notes.txt`;
    fs.writeFileSync(notesPath, result.notes || '');

    return {
      success: true,
      notes: result.notes,
    };
  } catch (error) {
    console.error('Error generating notes:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error generating notes',
    };
  }
});

// Add file system handlers
ipcMain.handle('file-exists', async (_, filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

// Update the update-recording-title handler
ipcMain.handle(
  'update-recording-title',
  async (
    _,
    { path: recordingPath, title }: { path: string; title: string },
  ) => {
    try {
      const folderPath = path.dirname(recordingPath);
      return await updateRecordingMetadata(folderPath, { title });
    } catch (error) {
      console.error('Error updating recording title:', error);
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error updating title',
      };
    }
  },
);

// Add save manual notes handler
ipcMain.handle(
  'save-manual-notes',
  async (_, filePath: string, notes: string) => {
    try {
      const folderPath = path.dirname(filePath);
      const timestamp = path
        .basename(folderPath)
        .match(/recording-(\d+)$/)?.[1];

      if (!timestamp) {
        return { error: 'Invalid recording folder structure' };
      }

      const manualNotesPath = path.join(
        folderPath,
        `manual-notes-${timestamp}.txt`,
      );
      fs.writeFileSync(manualNotesPath, notes);

      return { success: true };
    } catch (error) {
      console.error('Error saving manual notes:', error);
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save manual notes',
      };
    }
  },
);

// Add get manual notes handler
ipcMain.handle('get-manual-notes', async (_, filePath: string) => {
  try {
    const folderPath = path.dirname(filePath);
    const timestamp = path.basename(folderPath).match(/recording-(\d+)$/)?.[1];

    if (!timestamp) {
      return { error: 'Invalid recording folder structure' };
    }

    const manualNotesPath = path.join(
      folderPath,
      `manual-notes-${timestamp}.txt`,
    );

    try {
      const notes = fs.readFileSync(manualNotesPath, 'utf8');
      return { success: true, notes };
    } catch (err) {
      // Return empty string if file doesn't exist
      return { success: true, notes: '' };
    }
  } catch (error) {
    console.error('Error reading manual notes:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to read manual notes',
    };
  }
});

// Add new audio playback IPC handlers
ipcMain.handle('get-audio-duration', async (_, filePath: string) => {
  try {
    const metadata = await mm.parseFile(filePath);
    return { duration: metadata.format.duration || 0 };
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return { error: 'Failed to get audio duration' };
  }
});
