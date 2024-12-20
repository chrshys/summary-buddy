/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export const getFilePathsForRecording = (recordingPath: string) => {
  const folderPath = path.dirname(recordingPath);
  const timestamp = path.basename(folderPath).match(/recording-(\d+)$/)?.[1];

  if (!timestamp) {
    return null;
  }

  return {
    transcriptPath: path.join(folderPath, `transcript-${timestamp}.txt`),
    summaryPath: path.join(folderPath, `summary-${timestamp}.txt`),
    actionItemsPath: path.join(folderPath, `actions-${timestamp}.txt`),
  };
};
