import { IElectronAPI, RecordingInfo } from './types/electron';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: IElectronAPI;
  }
}

export default RecordingInfo;
