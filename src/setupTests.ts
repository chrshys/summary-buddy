Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock electron API
Object.defineProperty(window, 'electron', {
  value: {
    audioRecorder: {
      getRecordingsPath: jest.fn().mockResolvedValue('/mock/path'),
      getPinnedState: jest.fn().mockResolvedValue({}),
      onRecordingAdded: jest.fn(() => jest.fn()),
      onRecordingDeleted: jest.fn(() => jest.fn()),
      onRecordingPinned: jest.fn(() => jest.fn()),
      onRecordingUnpinned: jest.fn(() => jest.fn()),
      onRecordingUpdated: jest.fn(() => jest.fn()),
      onRecordingStarted: jest.fn(() => jest.fn()),
      onRecordingStopped: jest.fn(() => jest.fn()),
      onRecordingProgress: jest.fn(() => jest.fn()),
      onRecordingError: jest.fn(() => jest.fn()),
    },
    store: {
      get: jest.fn(),
      set: jest.fn(),
      // Add other store methods as needed
    },
    ipcRenderer: {
      on: jest.fn().mockImplementation(() => jest.fn()),
      once: jest.fn(),
      removeListener: jest.fn(),
      send: jest.fn(),
    },
    onNotesGenerated: jest.fn(() => jest.fn()),
    onRecordingStarted: jest.fn(() => jest.fn()),
    onRecordingStopped: jest.fn(() => jest.fn()),
    onRecordingProgress: jest.fn(() => jest.fn()),
    onRecordingError: jest.fn(() => jest.fn()),
  },
});
