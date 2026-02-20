import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { run, checkXcodeTools, detectAndroidSdk } from './utils.js';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const SHARED_TOOLS: Tool[] = [
  {
    name: 'list_devices',
    description: 'List all connected Android devices (ADB) and iOS Simulators (xcrun).',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['all', 'android', 'ios'], default: 'all' },
      },
    },
  },
  {
    name: 'test_performance',
    description: 'Run a performance test on an app, measuring CPU and memory over time.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        packageName: { type: 'string', description: 'App Bundle ID (e.g. com.example.app)' },
        platform: { type: 'string', enum: ['android', 'ios'], default: 'android' },
        durationSec: { type: 'number', default: 10, description: 'Test duration in seconds' },
      },
      required: ['packageName'],
    },
  },
  {
    name: 'open_deep_link',
    description: 'Open a deep link or URL on the device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        url: { type: 'string', description: 'URL to open (e.g. myapp://path or https://google.com)' },
        platform: { type: 'string', enum: ['android', 'ios'], default: 'android' },
      },
      required: ['url'],
    },
  },
  {
    name: 'record_video',
    description: 'Record a short video of the device screen.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        durationSec: { type: 'number', default: 5, description: 'Duration in seconds (max 60)' },
        platform: { type: 'string', enum: ['android', 'ios'], default: 'android' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'run_maestro_flow',
    description: 'Execute a Maestro UI automation flow.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Target device serial or UDID' },
        flowPath: { type: 'string', description: 'Path to the .yaml Maestro flow file' },
      },
      required: ['flowPath'],
    },
  },
  {
    name: 'analyze_logs',
    description: 'Get logs filtered by mode (crash, anr, network).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        mode: { type: 'string', enum: ['all', 'crash', 'anr', 'network'], default: 'all' },
        lines: { type: 'number', default: 500 },
      },
    },
  },
];

export async function handleSharedTool(name: string, args: Record<string, unknown> | undefined) {
  switch (name) {
    case 'list_devices': {
      const platform = (args?.platform as string) || 'all';
      const devices: any[] = [];
      const hasAdb = detectAndroidSdk();
      const hasXcode = checkXcodeTools();

      if (platform === 'all' || platform === 'android') {
        try {
          const adbOut = await run('adb', ['devices', '-l']);
          if (adbOut) {
            const lines = adbOut.split('\n').slice(1);
            for (const line of lines) {
              if (line.trim() && !line.includes('offline')) {
                const parts = line.split(/\s+/);
                devices.push({
                  platform: 'android',
                  id: parts[0],
                  state: parts[1],
                  details: line.substring(line.indexOf(parts[2] || '')).trim(),
                });
              }
            }
          }
        } catch {
          // ignore error
        }
      }

      if (platform === 'all' || platform === 'ios') {
        try {
          const simOut = await run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']);
          const simJson = JSON.parse(simOut);

          for (const runtime in simJson.devices) {
            const runtimeName = runtime.replace('com.apple.CoreSimulator.SimRuntime.', '');
            for (const dev of simJson.devices[runtime]) {
              if (dev.state === 'Booted') {
                devices.push({
                  platform: 'ios',
                  id: dev.udid,
                  name: dev.name,
                  state: dev.state,
                  runtime: runtimeName,
                });
              }
            }
          }
        } catch {
          // ignore error
        }
      }

      if (devices.length === 0) {
        let helpText = 'No devices found.\n\n';
        if (platform === 'all' || platform === 'android') {
          if (!hasAdb) helpText += 'Android: ADB not found.\n';
          else helpText += "Android: Run 'adb devices' to authorize.\n";
        }
        if (platform === 'all' || platform === 'ios') {
          if (!hasXcode) helpText += 'iOS: Xcode tools not found.\n';
          else helpText += "iOS: Boot a simulator with 'xcrun simctl boot <UUID>'.\n";
        }
        return { content: [{ type: 'text', text: helpText }] };
      }

      return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
    }

    case 'test_performance': {
      const { packageName, deviceId, platform = 'android', durationSec = 10 } = args as any;
      const cpuSamples: number[] = [];
      const memorySamples: number[] = [];

      for (let i = 0; i < durationSec; i++) {
        if (platform === 'android') {
          const adbArgs = deviceId ? ['-s', deviceId] : [];
          try {
            const topOut = await run('adb', [...adbArgs, 'shell', 'top', '-b', '-n', '1']);
            const appLine = topOut.split('\n').find((l) => l.includes(packageName));
            if (appLine) {
              const parts = appLine.trim().split(/\s+/);
              const cpuMatch = parts.find((p) => p.includes('%'));
              if (cpuMatch) {
                const cpuVal = parseFloat(cpuMatch.replace('%', ''));
                if (!isNaN(cpuVal)) cpuSamples.push(cpuVal);
              }
            }
            const memInfo = await run('adb', [...adbArgs, 'shell', 'dumpsys', 'meminfo', packageName]);
            const totalLine = memInfo.split('\n').find((l) => l.trim().startsWith('TOTAL'));
            if (totalLine) {
              const parts = totalLine.trim().split(/\s+/);
              const pssKb = parseInt(parts[1]);
              if (!isNaN(pssKb)) memorySamples.push(Math.round(pssKb / 1024));
            }
          } catch {
            // ignore error
          }
        } else {
          try {
            const psOut = await run('xcrun', ['simctl', 'spawn', deviceId, 'ps', 'aux']);
            const appLine = psOut.split('\n').find((l) => l.includes(packageName));
            if (appLine) {
              const parts = appLine.split(/\s+/);
              const cpuVal = parseFloat(parts[2]);
              const memVal = parseFloat(parts[3]);
              if (!isNaN(cpuVal)) cpuSamples.push(cpuVal);
              if (!isNaN(memVal)) memorySamples.push(Math.round((memVal * 1024) / 100));
            }
          } catch {
            // ignore error
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                packageName,
                platform,
                cpu: {
                  average:
                    cpuSamples.length > 0
                      ? `${(cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length).toFixed(1)}%`
                      : 'N/A',
                  max: cpuSamples.length > 0 ? `${Math.max(...cpuSamples).toFixed(1)}%` : 'N/A',
                },
                memory: {
                  average:
                    memorySamples.length > 0
                      ? `${(memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length).toFixed(0)} MB`
                      : 'N/A',
                  max: memorySamples.length > 0 ? `${Math.max(...memorySamples)} MB` : 'N/A',
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'record_video': {
      const { deviceId, durationSec = 5, platform = 'android' } = args as any;
      if (durationSec > 60) throw new Error('Max duration is 60 seconds');

      const tempPath = path.join(os.tmpdir(), `rec_${Date.now()}.mp4`);
      if (platform === 'android') {
        const adbArgs = deviceId ? ['-s', deviceId] : [];
        await run('adb', [
          ...adbArgs,
          'shell',
          'screenrecord',
          '--time-limit',
          durationSec.toString(),
          '/sdcard/mcp_rec.mp4',
        ]);
        await run('adb', [...adbArgs, 'pull', '/sdcard/mcp_rec.mp4', tempPath]);
        await run('adb', [...adbArgs, 'shell', 'rm', '/sdcard/mcp_rec.mp4']);
      } else {
        const subprocess = execa('xcrun', ['simctl', 'io', deviceId, 'recordVideo', tempPath]);
        await new Promise((r) => setTimeout(r, durationSec * 1000));
        subprocess.kill('SIGINT');
        try {
          await subprocess;
        } catch {
          // ignore
        }
      }

      const base64 = fs.readFileSync(tempPath).toString('base64');
      fs.unlinkSync(tempPath);
      return {
        content: [
          { type: 'text', text: `Video recorded (${durationSec}s).` },
          { type: 'image', data: base64, mimeType: 'video/mp4' },
        ],
      };
    }

    case 'run_maestro_flow': {
      const { flowPath, deviceId } = args as any;
      const maestroArgs = ['test', flowPath];
      if (deviceId) {
        maestroArgs.push('--device', deviceId);
      }
      const output = await run('maestro', maestroArgs);
      return { content: [{ type: 'text', text: output }] };
    }

    case 'analyze_logs': {
      const { mode = 'all', lines = 500, deviceId } = args as any;
      const adbArgs = deviceId ? ['-s', deviceId] : [];
      const logOut = await run('adb', [...adbArgs, 'logcat', '-d', '-t', lines.toString()]);
      const filtered = logOut.split('\n').filter((line) => {
        if (mode === 'all') return true;
        if (mode === 'crash' || mode === 'anr') {
          return (
            line.includes('FATAL EXCEPTION') ||
            line.includes('AndroidRuntime') ||
            line.includes('ANR in')
          );
        }
        if (mode === 'network') return line.match(/OkHttp|Retrofit|Volley|HTTP/i);
        return true;
      });
      return { content: [{ type: 'text', text: filtered.join('\n') || 'No matching logs.' }] };
    }

    case 'open_deep_link': {
      const { url, deviceId, platform = 'android' } = args as any;
      if (platform === 'android') {
        const adbArgs = deviceId ? ['-s', deviceId] : [];
        await run('adb', [
          ...adbArgs,
          'shell',
          'am',
          'start',
          '-a',
          'android.intent.action.VIEW',
          '-d',
          url,
        ]);
      } else {
        await run('xcrun', ['simctl', 'openurl', deviceId, url]);
      }
      return { content: [{ type: 'text', text: `Opened ${url}` }] };
    }

    default:
      throw new Error(`Tool ${name} not implemented in shared handler`);
  }
}
