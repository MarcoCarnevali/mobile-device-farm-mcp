#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { detectAndroidSdk, checkXcodeTools } from './common/utils.js';
import { ANDROID_TOOLS, handleAndroidTool } from './platforms/android.js';
import { IOS_TOOLS, handleIosTool } from './platforms/ios.js';
import { SHARED_TOOLS, handleSharedTool } from './common/shared-tools.js';

dotenv.config();

const hasAdb = detectAndroidSdk();
const hasXcode = checkXcodeTools();

const TOOLS = [...SHARED_TOOLS, ...ANDROID_TOOLS, ...IOS_TOOLS];

const server = new Server(
  {
    name: 'mobile-device-farm-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name.startsWith('adb_') || ['get_device_info', 'get_app_vitals', 'run_monkey'].includes(name)) {
      return await handleAndroidTool(name, args);
    }
    if (name.startsWith('ios_')) {
      return await handleIosTool(name, args);
    }
    return await handleSharedTool(name, args);
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  console.error('╔════════════════════════════════════════════════════════╗');
  console.error('║    Mobile Device Farm MCP Server (Modular)             ║');
  console.error('╚════════════════════════════════════════════════════════╝');
  console.error('');

  if (hasAdb) console.error('✓ ADB detected');
  else console.error('✗ ADB not found');

  if (hasXcode) console.error('✓ Xcode tools detected');
  else console.error('✗ Xcode tools not found');

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
