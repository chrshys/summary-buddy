import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

class SoxError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'SoxError';
  }
}

export const getSoxDirectory = (): string => {
  return process.env.NODE_ENV === 'development'
    ? path.join(process.cwd(), 'installers', 'mac', 'sox-14.4.2')
    : path.join(process.resourcesPath, 'installers', 'mac', 'sox-14.4.2');
};

export const getSoxPath = (): string => {
  const soxPath = path.join(getSoxDirectory(), 'sox');

  if (!fs.existsSync(soxPath)) {
    throw new SoxError('Sox binary not found', 'ENOENT');
  }

  try {
    fs.chmodSync(soxPath, '755');
  } catch (error) {
    throw new SoxError(
      `Failed to make sox executable: ${(error as Error).message}`,
    );
  }

  return soxPath;
};

export const setupSoxSymlinks = async (): Promise<void> => {
  const soxDir = getSoxDirectory();
  const symlinks = ['play', 'rec', 'soxi'];

  symlinks.forEach((link) => {
    const linkPath = path.join(soxDir, link);
    const targetPath = path.join(soxDir, 'sox');

    try {
      if (fs.existsSync(linkPath)) {
        fs.unlinkSync(linkPath);
      }
      fs.symlinkSync(targetPath, linkPath);
      fs.chmodSync(linkPath, '755');
    } catch (error) {
      throw new SoxError(
        `Failed to create symlink ${link}: ${(error as Error).message}`,
      );
    }
  });
};

export const checkSoxInstallation = async (): Promise<boolean> => {
  try {
    const soxPath = getSoxPath();
    await execFileAsync(soxPath, ['--version']);
    await setupSoxSymlinks();
    return true;
  } catch (error) {
    if (error instanceof SoxError) {
      throw error;
    }
    throw new SoxError(`Sox check failed: ${(error as Error).message}`);
  }
};

export const record = async (
  outputPath: string,
  options: {
    channels?: number;
    rate?: number;
    duration?: number;
  } = {},
): Promise<void> => {
  const soxDir = getSoxDirectory();
  const recPath = path.join(soxDir, 'rec');

  const args = [
    outputPath,
    'channels',
    String(options.channels || 1),
    'rate',
    String(options.rate || 44100),
  ];

  if (options.duration) {
    args.push('trim', '0', String(options.duration));
  }

  try {
    await execFileAsync(recPath, args);
  } catch (error) {
    throw new SoxError(`Recording failed: ${(error as Error).message}`);
  }
};
