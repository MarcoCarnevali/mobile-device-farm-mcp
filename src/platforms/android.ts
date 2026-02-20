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
    name: 'adb_swipe',
    description: 'Simulate a swipe gesture on Android screen.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        x1: { type: 'number', description: 'Start X' },
        y1: { type: 'number', description: 'Start Y' },
        x2: { type: 'number', description: 'End X' },
        y2: { type: 'number', description: 'End Y' },
        duration: { type: 'number', default: 500, description: 'Duration in ms' },
      },
      required: ['x1', 'y1', 'x2', 'y2'],
    },
  },
  {
    name: 'adb_input_text',
    description: 'Input text into the currently focused field (ADB).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        text: { type: 'string', description: 'Text to type (spaces must be escaped or use %s)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'adb_key_event',
    description: 'Send a key event (e.g., HOME, BACK, ENTER) to the device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        keycode: {
          type: 'string',
          description: 'Key code or name (e.g., KEYCODE_HOME, 3, BACK, ENTER)',
        },
      },
      required: ['keycode'],
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
    name: 'adb_push',
    description: 'Push a file to an Android device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        localPath: { type: 'string' },
        remotePath: { type: 'string' },
      },
      required: ['localPath', 'remotePath'],
    },
  },
  {
    name: 'adb_pull',
    description: 'Pull a file from an Android device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        remotePath: { type: 'string' },
        localPath: { type: 'string' },
      },
      required: ['localPath', 'remotePath'],
    },
  },
  {
    name: 'get_device_info',
    description: 'Get Android device details (Battery, Resolution, SDK, Model).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
      }
    }
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
    name: 'adb_force_stop',
    description: 'Force stop an application (kill process).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string' },
      },
      required: ['packageName'],
    },
  },
  {
    name: 'adb_wifi',
    description: 'Enable or disable WiFi on the device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        enabled: { type: 'boolean', description: 'true to enable, false to disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'adb_network_status',
    description: 'Check if the device has internet connectivity (pings Google DNS).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
      },
    },
  },
  {
    name: 'adb_set_battery_level',
    description: 'Set the simulated battery level (0-100) on the device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        level: { type: 'number', minimum: 0, maximum: 100 },
      },
      required: ['level'],
    },
  },
  {
    name: 'adb_set_animations',
    description: 'Enable, disable, or speed up system animations.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        scale: {
          type: 'number',
          description: 'Animation scale (0.0 for off, 1.0 for normal, 0.5 for fast)',
        },
      },
      required: ['scale'],
    },
  },
  {
    name: 'adb_reboot',
    description: 'Reboot the Android device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
      },
    },
  },
  {
    name: 'adb_clear_app_data',
    description: 'Clear app data and cache (reset to fresh install state).',
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
    name: 'adb_grant_permissions',
    description: 'Grant runtime permissions to an app.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of permissions (e.g. android.permission.CAMERA)',
        },
      },
      required: ['packageName', 'permissions'],
    },
  },
  {
    name: 'adb_revoke_permissions',
    description: 'Revoke runtime permissions from an app.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of permissions (e.g. android.permission.CAMERA)',
        },
      },
      required: ['packageName', 'permissions'],
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

    case 'adb_swipe': {
      const { x1, y1, x2, y2, duration = 500 } = args as any;
      await run('adb', [
        ...adbArgs,
        'shell',
        'input',
        'swipe',
        x1,
        y1,
        x2,
        y2,
        duration.toString(),
      ]);
      return { content: [{ type: 'text', text: `Swiped from (${x1},${y1}) to (${x2},${y2})` }] };
    }

    case 'adb_input_text': {
      const text = args?.text as string;
      const escapedText = text.replace(/ /g, '%s').replace(/'/g, "\\'"); // Basic escaping
      await run('adb', [...adbArgs, 'shell', 'input', 'text', escapedText]);
      return { content: [{ type: 'text', text: `Typed: "${text}"` }] };
    }

    case 'adb_key_event': {
      let keycode = args?.keycode as string;
      // Map common names to keycodes
      const keyMap: Record<string, string> = {
        HOME: 'KEYCODE_HOME',
        BACK: 'KEYCODE_BACK',
        ENTER: 'KEYCODE_ENTER',
        APP_SWITCH: 'KEYCODE_APP_SWITCH',
        MENU: 'KEYCODE_MENU',
        VOLUME_UP: 'KEYCODE_VOLUME_UP',
        VOLUME_DOWN: 'KEYCODE_VOLUME_DOWN',
        POWER: 'KEYCODE_POWER',
      };
      if (keyMap[keycode.toUpperCase()]) {
        keycode = keyMap[keycode.toUpperCase()];
      }
      await run('adb', [...adbArgs, 'shell', 'input', 'keyevent', keycode]);
      return { content: [{ type: 'text', text: `Sent key event: ${keycode}` }] };
    }

    case 'adb_shell': {
      const cmd = args?.command as string;
      const output = await run('adb', [...adbArgs, 'shell', cmd]);
      return { content: [{ type: 'text', text: output }] };
    }

    case 'adb_push': {
      const localPath = args?.localPath as string;
      const remotePath = args?.remotePath as string;
      await run('adb', [...adbArgs, 'push', localPath, remotePath]);
      return { content: [{ type: 'text', text: `Successfully pushed ${localPath} to ${remotePath}` }] };
    }

    case 'adb_pull': {
      const remotePath = args?.remotePath as string;
      const localPath = args?.localPath as string;
      await run('adb', [...adbArgs, 'pull', remotePath, localPath]);
      return { content: [{ type: 'text', text: `Successfully pulled ${remotePath} to ${localPath}` }] };
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
      } catch {
        // ignore errors
      }

      let cpu = 'unknown';
      try {
        const topOut = await run('adb', [...adbArgs, 'shell', 'top', '-b', '-n', '1']);
        const appLine = topOut.split('\n').find((l) => l.includes(packageName));
        if (appLine) {
          const parts = appLine.trim().split(/\s+/);
          const percent = parts.find((p) => p.includes('%'));
          if (percent) cpu = percent;
        }
      } catch {
        // ignore errors
      }

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
      } catch {
        // ignore errors
      }

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

    case 'adb_force_stop': {
      const packageName = args?.packageName as string;
      if (!packageName) throw new Error('packageName required');
      await run('adb', [...adbArgs, 'shell', 'am', 'force-stop', packageName]);
      return { content: [{ type: 'text', text: `Force stopped ${packageName}` }] };
    }

    case 'adb_wifi': {
      const enabled = args?.enabled as boolean;
      await run('adb', [...adbArgs, 'shell', 'svc', 'wifi', enabled ? 'enable' : 'disable']);
      return { content: [{ type: 'text', text: `WiFi ${enabled ? 'enabled' : 'disabled'}` }] };
    }

    case 'adb_network_status': {
      try {
        const pingOut = await run('adb', [...adbArgs, 'shell', 'ping', '-c', '1', '8.8.8.8']);
        const isConnected = pingOut.includes('1 packets transmitted, 1 received');
        return {
          content: [
            {
              type: 'text',
              text: isConnected
                ? 'Online (Ping 8.8.8.8 successful)'
                : 'Offline (Ping 8.8.8.8 failed)',
            },
          ],
        };
      } catch {
        return { content: [{ type: 'text', text: 'Offline (Ping command failed)' }] };
      }
    }

    case 'adb_set_battery_level': {
      const level = args?.level as number;
      await run('adb', [...adbArgs, 'shell', 'dumpsys', 'battery', 'set', 'level', level.toString()]);
      return { content: [{ type: 'text', text: `Simulated battery level set to ${level}%` }] };
    }

    case 'adb_set_animations': {
      const scale = args?.scale as number;
      const s = scale.toString();
      await run('adb', [...adbArgs, 'shell', 'settings', 'put', 'global', 'window_animation_scale', s]);
      await run('adb', [...adbArgs, 'shell', 'settings', 'put', 'global', 'transition_animation_scale', s]);
      await run('adb', [...adbArgs, 'shell', 'settings', 'put', 'global', 'animator_duration_scale', s]);
      return { content: [{ type: 'text', text: `Animation scales set to ${scale}` }] };
    }

    case 'adb_reboot': {
      await run('adb', [...adbArgs, 'reboot']);
      return { content: [{ type: 'text', text: 'Device is rebooting...' }] };
    }

    case 'adb_clear_app_data': {
      const packageName = args?.packageName as string;
      if (!packageName) throw new Error('packageName required');
      await run('adb', [...adbArgs, 'shell', 'pm', 'clear', packageName]);
      return { content: [{ type: 'text', text: `Cleared data for ${packageName}` }] };
    }

    case 'adb_grant_permissions': {
      const { packageName, permissions } = args as any;
      if (!packageName || !Array.isArray(permissions)) throw new Error('Invalid arguments');
      for (const perm of permissions) {
        await run('adb', [...adbArgs, 'shell', 'pm', 'grant', packageName, perm]);
      }
      return { content: [{ type: 'text', text: `Granted permissions to ${packageName}: ${permissions.join(', ')}` }] };
    }

    case 'adb_revoke_permissions': {
      const { packageName, permissions } = args as any;
      if (!packageName || !Array.isArray(permissions)) throw new Error('Invalid arguments');
      for (const perm of permissions) {
        await run('adb', [...adbArgs, 'shell', 'pm', 'revoke', packageName, perm]);
      }
      return { content: [{ type: 'text', text: `Revoked permissions from ${packageName}: ${permissions.join(', ')}` }] };
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
