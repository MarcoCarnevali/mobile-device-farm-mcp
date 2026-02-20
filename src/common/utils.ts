import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function commandExists(command: string): boolean {
  try {
    const { execSync } = require('child_process');
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

export async function run(command: string, args: string[], options: any = {}): Promise<string> {
  try {
    const { stdout } = await execa(command, args, options);
    return stdout ?? '';
  } catch (error: any) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error.message}`);
  }
}
