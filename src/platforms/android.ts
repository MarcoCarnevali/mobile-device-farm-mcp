import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { run } from '../common/utils.js';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const ANDROID_TOOLS: Tool[] = [
  {
    name: 'adb_install',
    description: 'Install an APK on an Android device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Target device serial (optional if only one connected)' },
        apkPath: { type: 'string', description: 'Local path to .apk file' },
      },
      required: ['apkPath'],
    },
  },
  {
    name: 'adb_screenshot',
    description: 'Capture a screenshot from an Android device (returns base64 PNG).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Target device serial' },
      },
    },
  },
  {
    name: 'adb_get_ui_hierarchy',
    description: 'Get the current UI hierarchy (XML) to inspect elements and find coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
      },
    },
  },
  {
    name: 'adb_logcat',
    description: 'Get recent logs from an Android device (last N lines).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Target device serial' },
        lines: { type: 'number', default: 100 },
        filter: { type: 'string', description: 'Optional grep filter' },
      },
    },
  },
  {
    name: 'adb_tap',
    description: 'Simulate a tap on Android screen coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'adb_shell',
    description: "Run a raw ADB shell command (use carefully).",
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        command: { type: 'string', description: "Command to run inside 'adb shell'" },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_device_info',
    description: 'Get Android device details (Battery, Resolution, SDK, Model).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
      },
    },
  },
  {
    name: 'get_app_vitals',
    description: 'Get performance stats (CPU, Memory) and check for recent crashes/ANRs.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string', description: 'App Bundle ID (e.g. com.example.app)' },
      },
      required: ['packageName'],
    },
  },
  {
    name: 'run_monkey',
    description: 'Run a Chaos Monkey stress test (Android only).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string' },
        events: { type: 'number', default: 500, description: 'Number of random events to trigger' },
      },
      required: ['packageName'],
    },
  },
];

export async function handleAndroidTool(name: string, args: any) {
  const deviceId = args?.deviceId as string;
  const adbArgs = deviceId ? ['-s', deviceId] : [];

  switch (name) {
    case 'adb_install': {
      const apkPath = args?.apkPath as string;
      await run('adb', [...adbArgs, 'install', '-r', apkPath]);
      return { content: [{ type: 'text', text: `Successfully installed ${apkPath}` }] };
    }

    case 'adb_get_ui_hierarchy': {
      const tempPath = path.join(os.tmpdir(), `dump_${Date.now()}.xml`);
      // 1. Dump UI XML to device storage
      await run('adb', [...adbArgs, 'shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml']);
      // 2. Pull the file to local temp
      await run('adb', [...adbArgs, 'pull', '/sdcard/window_dump.xml', tempPath]);
      // 3. Clean up device storage
      await run('adb', [...adbArgs, 'shell', 'rm', '/sdcard/window_dump.xml']);

      const xmlContent = fs.readFileSync(tempPath, 'utf-8');
      fs.unlinkSync(tempPath);

      return { content: [{ type: 'text', text: xmlContent }] };
    }

    case 'adb_screenshot': {
      const { stdout } = await execa('adb', [...adbArgs, 'exec-out', 'screencap', '-p'], {
        encoding: 'buffer',
        stripFinalNewline: false,
      });
      const base64 = (stdout as unknown as Buffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return {
        content: [
          { type: 'text', text: 'Screenshot captured:' },
          { type: 'image', data: dataUrl, mimeType: 'image/png' },
        ],
      };
    }

    case 'adb_logcat': {
      const lines = (args?.lines as number) || 100;
      const filter = (args?.filter as string) || '';
      const cmd = ['logcat', '-d', '-t', lines.toString()];
      if (filter) cmd.push(filter);

      const logs = await run('adb', [...adbArgs, ...cmd]);
      return { content: [{ type: 'text', text: logs }] };
    }

    case 'adb_tap': {
      const { x, y } = args as any;
      await run('adb', [...adbArgs, 'shell', 'input', 'tap', x, y]);
      return { content: [{ type: 'text', text: `Tapped at ${x},${y}` }] };
    }

    case 'adb_shell': {
      const cmd = args?.command as string;
      const output = await run('adb', [...adbArgs, 'shell', cmd]);
      return { content: [{ type: 'text', text: output }] };
    }

    case 'get_device_info': {
      const model = await run('adb', [...adbArgs, 'shell', 'getprop', 'ro.product.model']);
      const androidVer = await run('adb', [
        ...adbArgs,
        'shell',
        'getprop',
        'ro.build.version.release',
      ]);
      const sdk = await run('adb', [...adbArgs, 'shell', 'getprop', 'ro.build.version.sdk']);
      const wmSize = await run('adb', [...adbArgs, 'shell', 'wm', 'size']);

      const batteryDump = await run('adb', [...adbArgs, 'shell', 'dumpsys', 'battery']);
      const levelMatch = batteryDump.match(/level: (\d+)/);
      const level = levelMatch ? levelMatch[1] : 'unknown';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                model: model.trim(),
                androidVersion: androidVer.trim(),
                sdkLevel: sdk.trim(),
                resolution: wmSize.trim(),
                batteryLevel: `${level}%`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'get_app_vitals': {
      const packageName = args?.packageName as string;
      if (!packageName) throw new Error('packageName required');

      let memory = 'unknown';
      try {
        const memInfo = await run('adb', [...adbArgs, 'shell', 'dumpsys', 'meminfo', packageName]);
        const totalLine = memInfo.split('\n').find((l) => l.trim().startsWith('TOTAL'));
        if (totalLine) {
          const parts = totalLine.trim().split(/\s+/);
          const pssKb = parseInt(parts[1]);
          if (!isNaN(pssKb)) {
            memory = `${Math.round(pssKb / 1024)} MB`;
          }
        }
      } catch (e) {}

      let cpu = 'unknown';
      try {
        const topOut = await run('adb', [...adbArgs, 'shell', 'top', '-b', '-n', '1']);
        const appLine = topOut.split('\n').find((l) => l.includes(packageName));
        if (appLine) {
          const parts = appLine.trim().split(/\s+/);
          const percent = parts.find((p) => p.includes('%'));
          if (percent) cpu = percent;
        }
      } catch (e) {}

      let status = 'Running';
      const errors: string[] = [];
      try {
        const logOut = await run('adb', [...adbArgs, 'logcat', '-d', '-t', '200']);
        if (logOut) {
          const lines = logOut.split('\n');
          for (const line of lines) {
            if (line.includes('FATAL EXCEPTION') && line.includes(packageName)) {
              status = 'CRASHED';
              errors.push(line.trim());
            } else if (line.includes(`ANR in ${packageName}`)) {
              status = 'ANR';
              errors.push('Application Not Responding (ANR) detected');
            }
          }
        }
      } catch (e) {}

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                packageName,
                status,
                memoryPss: memory,
                cpuUsage: cpu,
                recentErrors: errors.length > 0 ? errors : undefined,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'run_monkey': {
      const packageName = args?.packageName as string;
      const events = (args?.events as number) || 500;

      try {
        const monkeyOut = await run('adb', [
          ...adbArgs,
          'shell',
          'monkey',
          '-p',
          packageName,
          '-v',
          events.toString(),
        ]);
        return {
          content: [
            { type: 'text', text: `Chaos Monkey finished ${events} events.` },
            { type: 'text', text: monkeyOut },
          ],
        };
      } catch (e: any) {
        return {
          content: [
            { type: 'text', text: `Monkey terminated early (Crash detected?):` },
            { type: 'text', text: e.message || 'Unknown error' },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Tool ${name} not implemented in Android handler`);
  }
}
