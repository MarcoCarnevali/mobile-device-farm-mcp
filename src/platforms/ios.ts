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
    name: 'ios_manage_privacy',
    description: 'Manage privacy permissions (grant/revoke/reset) for an app on the Simulator.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Simulator UDID' },
        action: {
          type: 'string',
          enum: ['grant', 'revoke', 'reset'],
          description: 'Action to perform',
        },
        service: {
          type: 'string',
          enum: [
            'all',
            'calendar',
            'contacts-limited',
            'contacts',
            'location',
            'location-always',
            'photos-add',
            'photos',
            'media-library',
            'microphone',
            'motion',
            'reminders',
            'siri',
          ],
          description: 'The service to manage (e.g., location, photos)',
        },
        bundleId: { type: 'string', description: 'App Bundle ID' },
      },
      required: ['deviceId', 'action', 'service', 'bundleId'],
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

    case 'ios_manage_privacy': {
      const { action, service, bundleId } = args;
      await run('xcrun', ['simctl', 'privacy', deviceId, action, service, bundleId]);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully performed '${action}' for service '${service}' on app '${bundleId}'`,
          },
        ],
      };
    }

    default:
      throw new Error(`Tool ${name} not implemented in iOS handler`);
  }
}
