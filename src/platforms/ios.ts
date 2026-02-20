import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { run } from '../common/utils.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const IOS_TOOLS: Tool[] = [
  {
    name: 'ios_install',
    description: 'Install an .app bundle on an iOS Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        appPath: { type: 'string', description: 'Path to .app bundle' },
      },
      required: ['deviceId', 'appPath'],
    },
  },
  {
    name: 'ios_screenshot',
    description: 'Capture a screenshot from an iOS Simulator (returns base64 PNG).',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID (must be booted)' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'ios_launch',
    description: 'Launch an installed app on iOS Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        bundleId: { type: 'string', description: 'App Bundle ID (e.g. com.example.app)' },
      },
      required: ['deviceId', 'bundleId'],
    },
  },
  {
    name: 'ios_terminate',
    description: 'Terminate a running app on iOS Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        bundleId: { type: 'string', description: 'App Bundle ID (e.g. com.example.app)' },
      },
      required: ['deviceId', 'bundleId'],
    },
  },
  {
    name: 'ios_uninstall',
    description: 'Uninstall an app from iOS Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        bundleId: { type: 'string', description: 'App Bundle ID (e.g. com.example.app)' },
      },
      required: ['deviceId', 'bundleId'],
    },
  },
  {
    name: 'ios_add_media',
    description: 'Add photos or videos to the Simulator photo library.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        localPath: { type: 'string', description: 'Local path to the media file' },
      },
      required: ['deviceId', 'localPath'],
    },
  },
  {
    name: 'ios_push_notification',
    description: 'Send a remote push notification to an app on the Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        bundleId: { type: 'string', description: 'Target app bundle ID' },
        payload: {
          type: 'object',
          description: 'APNs payload (JSON)',
        },
      },
      required: ['deviceId', 'bundleId', 'payload'],
    },
  },
];

export async function handleIosTool(name: string, args: any) {
  const deviceId = args?.deviceId as string;
  if (!deviceId) throw new Error('deviceId (UDID) is required for iOS tools.');

  switch (name) {
    case 'ios_install': {
      const appPath = args?.appPath as string;
      await run('xcrun', ['simctl', 'install', deviceId, appPath]);
      return { content: [{ type: 'text', text: `Installed ${appPath} on ${deviceId}` }] };
    }

    case 'ios_screenshot': {
      const tempFile = path.join(os.tmpdir(), `ios_screen_${Date.now()}.png`);
      await run('xcrun', ['simctl', 'io', deviceId, 'screenshot', tempFile]);
      const buffer = fs.readFileSync(tempFile);
      fs.unlinkSync(tempFile);

      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return {
        content: [
          { type: 'text', text: 'Screenshot captured:' },
          { type: 'image', data: dataUrl, mimeType: 'image/png' },
        ],
      };
    }

    case 'ios_launch': {
      const bundleId = args?.bundleId as string;
      await run('xcrun', ['simctl', 'launch', deviceId, bundleId]);
      return { content: [{ type: 'text', text: `Launched ${bundleId}` }] };
    }

    case 'ios_terminate': {
      const bundleId = args?.bundleId as string;
      await run('xcrun', ['simctl', 'terminate', deviceId, bundleId]);
      return { content: [{ type: 'text', text: `Terminated ${bundleId}` }] };
    }

    case 'ios_uninstall': {
      const bundleId = args?.bundleId as string;
      await run('xcrun', ['simctl', 'uninstall', deviceId, bundleId]);
      return { content: [{ type: 'text', text: `Uninstalled ${bundleId}` }] };
    }

    case 'ios_add_media': {
      const { localPath } = args;
      await run('xcrun', ['simctl', 'addmedia', deviceId, localPath]);
      return { content: [{ type: 'text', text: `Added media ${localPath} to ${deviceId}` }] };
    }

    case 'ios_push_notification': {
      const { bundleId, payload } = args;
      const tempPayloadPath = path.join(os.tmpdir(), `payload_${Date.now()}.json`);
      fs.writeFileSync(tempPayloadPath, JSON.stringify(payload));
      try {
        await run('xcrun', ['simctl', 'push', deviceId, bundleId, tempPayloadPath]);
        return { content: [{ type: 'text', text: `Sent push notification to ${bundleId}` }] };
      } finally {
        fs.unlinkSync(tempPayloadPath);
      }
    }

    default:
      throw new Error(`Tool ${name} not implemented in iOS handler`);
  }
}
