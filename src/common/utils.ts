import { execa } from 'execa';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function detectAndroidSdk(): boolean {
  if (commandExists('adb')) {
    return true;
  }

  const home = os.homedir();
  const commonPaths = [
    path.join(home, 'Library/Android/sdk/platform-tools'),
    path.join(home, 'Android/Sdk/platform-tools'),
    '/opt/android-sdk/platform-tools',
    '/usr/local/share/android-sdk/platform-tools',
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(path.join(p, 'adb'))) {
      process.env.PATH = `${p}:${process.env.PATH}`;
      return true;
    }
  }
  return false;
}

export function checkXcodeTools(): boolean {
  return commandExists('xcrun');
}

export async function run(command: string, args: string[], options: unknown = {}): Promise<string> {
  try {
    const { stdout } = await execa(command, args, options as any);
    return stdout ?? '';
  } catch (error: unknown) {
    const err = error as Error;
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${err.message}`, {
      cause: error,
    });
  }
}
