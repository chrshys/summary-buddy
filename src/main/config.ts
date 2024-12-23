import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface Config {
  assemblyAiKey?: string;
}

export function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}

export function readConfig(): Config {
  const configPath = getConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      // Create default config if it doesn't exist
      const defaultConfig: Config = {};
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading config:', error);
    return {};
  }
}

export function writeConfig(config: Config): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
} 