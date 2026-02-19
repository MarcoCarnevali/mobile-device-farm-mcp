#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { execa } from "execa";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";

dotenv.config();

// Helper: Check if command exists in PATH
function commandExists(command: string): boolean {
  try {
    const { execSync } = require('child_process');
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Helper: Auto-detect Android SDK if not in PATH
function detectAndroidSdk(): boolean {
  // Check if adb is already in PATH
  if (commandExists('adb')) {
    return true;
  }

  const home = os.homedir();
  const commonPaths = [
    path.join(home, "Library/Android/sdk/platform-tools"), // macOS
    path.join(home, "Android/Sdk/platform-tools"),         // Linux
    "/opt/android-sdk/platform-tools",
    "/usr/local/share/android-sdk/platform-tools"
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(path.join(p, "adb"))) {
      console.error(`✓ Found Android SDK at: ${p}`);
      process.env.PATH = `${p}:${process.env.PATH}`;
      return true;
    }
  }
  return false;
}

// Helper: Check Xcode tools
function checkXcodeTools(): boolean {
  return commandExists('xcrun');
}

// Initialize SDK detection on start
const hasAdb = detectAndroidSdk();
const hasXcode = checkXcodeTools();

// Helper: Run shell command safely
async function run(command: string, args: string[], options: any = {}) {
  try {
    const { stdout } = await execa(command, args, options);
    return stdout;
  } catch (error: any) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${error.message}`);
  }
}

// === TOOLS ===

const TOOLS: Tool[] = [
  // --- Discovery ---
  {
    name: "list_devices",
    description: "List all connected Android devices (ADB) and iOS Simulators (xcrun).",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["all", "android", "ios"], default: "all" },
      },
    },
  },

  // --- Android (ADB) ---
  {
    name: "adb_install",
    description: "Install an APK on an Android device.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Target device serial (optional if only one connected)" },
        apkPath: { type: "string", description: "Local path to .apk file" },
      },
      required: ["apkPath"],
    },
  },
  {
    name: "adb_screenshot",
    description: "Capture a screenshot from an Android device (returns base64 PNG).",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Target device serial" },
      },
    },
  },
  {
    name: "adb_logcat",
    description: "Get recent logs from an Android device (last N lines).",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Target device serial" },
        lines: { type: "number", default: 100 },
        filter: { type: "string", description: "Optional grep filter" }
      },
    },
  },
  {
    name: "adb_tap",
    description: "Simulate a tap on Android screen coordinates.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "adb_shell",
    description: "Run a raw ADB shell command (use carefully).",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        command: { type: "string", description: "Command to run inside 'adb shell'" }
      },
      required: ["command"]
    }
  },
  {
    name: "get_device_info",
    description: "Get Android device details (Battery, Resolution, SDK, Model).",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" }
      }
    }
  },
  {
    name: "get_app_vitals",
    description: "Get performance stats (CPU, Memory) and check for recent crashes/ANRs.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        packageName: { type: "string", description: "App Bundle ID (e.g. com.example.app)" }
      },
      required: ["packageName"]
    }
  },
  {
    name: "test_performance",
    description: "Run a performance test on an app, measuring CPU and memory over time.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        packageName: { type: "string", description: "App Bundle ID (e.g. com.example.app)" },
        durationSec: { type: "number", default: 10, description: "Test duration in seconds" }
      },
      required: ["packageName"]
    }
  },
  {
    name: "open_deep_link",
    description: "Open a deep link or URL on the device.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        url: { type: "string", description: "URL to open (e.g. myapp://path or https://google.com)" },
        platform: { type: "string", enum: ["android", "ios"], default: "android" }
      },
      required: ["url"]
    }
  },
  {
      name: "run_monkey",
      description: "Run a Chaos Monkey stress test (Android only).",
      inputSchema: {
          type: "object",
          properties: {
              deviceId: { type: "string" },
              packageName: { type: "string" },
              events: { type: "number", default: 500, description: "Number of random events to trigger" }
          },
          required: ["packageName"]
      }
  },
  {
      name: "record_video",
      description: "Record a short video of the device screen.",
      inputSchema: {
          type: "object",
          properties: {
              deviceId: { type: "string" },
              durationSec: { type: "number", default: 5, description: "Duration in seconds (max 60)" },
              platform: { type: "string", enum: ["android", "ios"], default: "android" }
          },
          required: ["deviceId"]
      }
  },

  // --- iOS (Simulators) ---
  {
    name: "ios_install",
    description: "Install an .app bundle on an iOS Simulator.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Simulator UDID" },
        appPath: { type: "string", description: "Path to .app bundle" },
      },
      required: ["deviceId", "appPath"],
    },
  },
  {
    name: "ios_screenshot",
    description: "Capture a screenshot from an iOS Simulator (returns base64 PNG).",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Simulator UDID (must be booted)" },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "ios_launch",
    description: "Launch an installed app on iOS Simulator.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "Simulator UDID" },
        bundleId: { type: "string", description: "App Bundle ID (e.g. com.example.app)" },
      },
      required: ["deviceId", "bundleId"],
    },
  },
];

// === SERVER ===

const server = new Server(
  {
    name: "mobile-device-farm-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // --- Discovery ---
    if (name === "list_devices") {
      const platform = (args?.platform as string) || "all";
      const devices: any[] = [];

      // Android
      if (platform === "all" || platform === "android") {
        try {
          const adbOut = (await run("adb", ["devices", "-l"])) as unknown as string;
          if (adbOut) {
            const lines = adbOut.split("\n").slice(1); // Skip header
            for (const line of lines) {
              if (line.trim() && !line.includes("offline")) {
                const parts = line.split(/\s+/);
                devices.push({
                  platform: "android",
                  id: parts[0],
                  state: parts[1],
                  details: line.substring(line.indexOf(parts[2] || "")).trim()
                });
              }
            }
          }
        } catch (e) {
          // ADB might not be installed or in path
        }
      }

      // iOS
      if (platform === "all" || platform === "ios") {
        try {
          const simOut = (await run("xcrun", ["simctl", "list", "devices", "available", "--json"])) as unknown as string;
          const simJson = JSON.parse(simOut);

          for (const runtime in simJson.devices) {
            const runtimeName = runtime.replace("com.apple.CoreSimulator.SimRuntime.", "");
            for (const dev of simJson.devices[runtime]) {
              if (dev.state === "Booted") {
                devices.push({
                  platform: "ios",
                  id: dev.udid,
                  name: dev.name,
                  state: dev.state,
                  runtime: runtimeName
                });
              }
            }
          }
        } catch (e) {
          // Xcode might not be installed
        }
      }

      if (devices.length === 0) {
        let helpText = "No devices found.\n\n";
        if (platform === "all" || platform === "android") {
          if (!hasAdb) {
            helpText += "Android: ADB not found. Install Android SDK.\n";
          } else {
            helpText += "Android: Connect a device and run 'adb devices' to authorize.\n";
          }
        }
        if (platform === "all" || platform === "ios") {
          if (!hasXcode) {
            helpText += "iOS: Xcode tools not found. Run 'xcode-select --install'.\n";
          } else {
            helpText += "iOS: Boot a simulator with 'xcrun simctl boot <UUID>'.\n";
          }
        }
        return {
          content: [{ type: "text", text: helpText }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(devices, null, 2) }],
      };
    }

    // --- Android ---
    if (name.startsWith("adb_")) {
      const deviceId = args?.deviceId as string;
      const adbArgs = deviceId ? ["-s", deviceId] : [];

      if (name === "adb_install") {
        const apkPath = args?.apkPath as string;
        await run("adb", [...adbArgs, "install", "-r", apkPath]);
        return { content: [{ type: "text", text: `Successfully installed ${apkPath}` }] };
      }

      if (name === "adb_screenshot") {
        // execa v9 buffer encoding
        const { stdout } = await execa(
          "adb",
          [...adbArgs, "exec-out", "screencap", "-p"],
          { encoding: "buffer", stripFinalNewline: false }
        );
        const base64 = (stdout as unknown as Buffer).toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;
        return {
          content: [
            { type: "text", text: "Screenshot captured:" },
            { type: "image", data: dataUrl, mimeType: "image/png" }
          ]
        };
      }

      if (name === "adb_logcat") {
        const lines = (args?.lines as number) || 100;
        const filter = (args?.filter as string) || "";
        const cmd = ["logcat", "-d", "-t", lines.toString()];
        if (filter) cmd.push(filter);

        const logs = (await run("adb", [...adbArgs, ...cmd])) as unknown as string;
        return { content: [{ type: "text", text: logs }] };
      }

      if (name === "adb_tap") {
        const { x, y } = args as any;
        await run("adb", [...adbArgs, "shell", "input", "tap", x, y]);
        return { content: [{ type: "text", text: `Tapped at ${x},${y}` }] };
      }

      if (name === "adb_shell") {
        const cmd = args?.command as string;
        const output = (await run("adb", [...adbArgs, "shell", cmd])) as unknown as string;
        return { content: [{ type: "text", text: output }] };
      }

      if (name === "get_device_info") {
        const adbArgs = args?.deviceId ? ["-s", args.deviceId as string] : [];
        const model = (await run("adb", [...adbArgs, "shell", "getprop", "ro.product.model"])) as unknown as string;
        const androidVer = (await run("adb", [...adbArgs, "shell", "getprop", "ro.build.version.release"])) as unknown as string;
        const sdk = (await run("adb", [...adbArgs, "shell", "getprop", "ro.build.version.sdk"])) as unknown as string;
        const wmSize = (await run("adb", [...adbArgs, "shell", "wm", "size"])) as unknown as string;

        // Battery info is multiline
        const batteryDump = (await run("adb", [...adbArgs, "shell", "dumpsys", "battery"])) as unknown as string;
        const levelMatch = batteryDump.match(/level: (\d+)/);
        const level = levelMatch ? levelMatch[1] : "unknown";

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              model: model.trim(),
              androidVersion: androidVer.trim(),
              sdkLevel: sdk.trim(),
              resolution: wmSize.trim(),
              batteryLevel: `${level}%`
            }, null, 2)
          }]
        };
      }

      if (name === "get_app_vitals") {
        const packageName = args?.packageName as string;
        const adbArgs = args?.deviceId ? ["-s", args.deviceId as string] : [];
        if (!packageName) throw new Error("packageName required");

        // Memory (PSS)
        let memory = "unknown";
        try {
          const memInfo = (await run("adb", [...adbArgs, "shell", "dumpsys", "meminfo", packageName])) as unknown as string;
          const totalLine = memInfo.split("\n").find(l => l.trim().startsWith("TOTAL"));
          if (totalLine) {
            const parts = totalLine.trim().split(/\s+/);
            const pssKb = parseInt(parts[1]);
            if (!isNaN(pssKb)) {
              memory = `${Math.round(pssKb / 1024)} MB`;
            }
          }
        } catch (e) {}

        // CPU
        let cpu = "unknown";
        try {
          const topOut = (await run("adb", [...adbArgs, "shell", "top", "-b", "-n", "1"])) as unknown as string;
          const appLine = topOut.split("\n").find(l => l.includes(packageName));
          if (appLine) {
            const parts = appLine.trim().split(/\s+/);
            const percent = parts.find(p => p.includes("%"));
            if (percent) cpu = percent;
          }
        } catch (e) {}

        // Crash/Error Detection (Health Check)
        let status = "Running";
        const errors: string[] = [];
        try {
          const logOut = (await run("adb", [...adbArgs, "logcat", "-d", "-t", "200"])) as unknown as string;
          if (logOut) {
            const lines = logOut.split("\n");
            for (const line of lines) {
              if (line.includes("FATAL EXCEPTION") && line.includes(packageName)) {
                status = "CRASHED";
                errors.push(line.trim());
              } else if (line.includes(`ANR in ${packageName}`)) {
                status = "ANR";
                errors.push("Application Not Responding (ANR) detected");
              }
            }
          }
        } catch (e) {}

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              packageName,
              status,
              memoryPss: memory,
              cpuUsage: cpu,
              recentErrors: errors.length > 0 ? errors : undefined
            }, null, 2)
          }]
        };
      }
    }

    if (name === "test_performance") {
      const packageName = args?.packageName as string;
      const deviceId = args?.deviceId as string;
      const durationSec = (args?.durationSec as number) || 10;
      const adbArgs = deviceId ? ["-s", deviceId] : [];

      if (!packageName) throw new Error("packageName required");

      const cpuSamples: number[] = [];
      const memorySamples: number[] = [];
      const intervalMs = 1000;
      const samples = durationSec;

      for (let i = 0; i < samples; i++) {
        try {
          const topOut = (await run("adb", [...adbArgs, "shell", "top", "-b", "-n", "1"])) as unknown as string;
          const appLine = topOut.split("\n").find(l => l.includes(packageName));
          if (appLine) {
            const parts = appLine.trim().split(/\s+/);
            const cpuMatch = parts.find(p => p.includes("%"));
            if (cpuMatch) {
              const cpuVal = parseFloat(cpuMatch.replace("%", ""));
              if (!isNaN(cpuVal)) cpuSamples.push(cpuVal);
            }
          }
        } catch (e) {}

        try {
          const memInfo = (await run("adb", [...adbArgs, "shell", "dumpsys", "meminfo", packageName])) as unknown as string;
          const totalLine = memInfo.split("\n").find(l => l.trim().startsWith("TOTAL"));
          if (totalLine) {
            const parts = totalLine.trim().split(/\s+/);
            const pssKb = parseInt(parts[1]);
            if (!isNaN(pssKb)) memorySamples.push(Math.round(pssKb / 1024));
          }
        } catch (e) {}

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

      const avgCpu = cpuSamples.length > 0 ? (cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length).toFixed(1) : "N/A";
      const maxCpu = cpuSamples.length > 0 ? Math.max(...cpuSamples).toFixed(1) : "N/A";
      const avgMem = memorySamples.length > 0 ? (memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length).toFixed(0) : "N/A";
      const maxMem = memorySamples.length > 0 ? Math.max(...memorySamples) : "N/A";

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            packageName,
            durationSec,
            samples,
            cpu: {
              average: `${avgCpu}%`,
              max: `${maxCpu}%`,
              samples: cpuSamples.map(c => c.toFixed(1))
            },
            memory: {
              average: `${avgMem} MB`,
              max: `${maxMem} MB`,
              samples: memorySamples.map(m => m.toString())
            }
          }, null, 2)
        }]
      };
    }

    if (name === "analyze_logs") {
      const mode = (args?.mode as string) || "all";
      const lines = (args?.lines as number) || 500;
      const deviceId = args?.deviceId as string;
      const adbArgs = deviceId ? ["-s", deviceId] : [];

      const logOut = (await run("adb", [...adbArgs, "logcat", "-d", "-t", lines.toString()])) as unknown as string;
      const logLines = logOut.split("\n");
      const filtered: string[] = [];

      for (const line of logLines) {
        if (mode === "all") {
          filtered.push(line);
          continue;
        }

        if (mode === "crash" || mode === "anr") {
          if (line.includes("FATAL EXCEPTION") || line.includes("AndroidRuntime") || line.includes("System.err")) {
            filtered.push(line);
          }
          if (mode === "anr" && line.includes("ANR in")) {
            filtered.push(line);
          }
        }

        if (mode === "network") {
          if (line.match(/OkHttp|Retrofit|Volley|HTTP|Response|Request/i)) {
            filtered.push(line);
          }
        }
      }

      return {
        content: [{ type: "text", text: filtered.length > 0 ? filtered.join("\n") : "No matching logs found." }]
      };
    }

    if (name === "run_monkey") {
        const packageName = args?.packageName as string;
        const events = (args?.events as number) || 500;
        const deviceId = args?.deviceId as string;
        const adbArgs = deviceId ? ["-s", deviceId] : [];
        
        try {
            const monkeyOut = (await run("adb", [...adbArgs, "shell", "monkey", "-p", packageName, "-v", events.toString()])) as unknown as string;
            return { 
                content: [
                    { type: "text", text: `Chaos Monkey finished ${events} events.` },
                    { type: "text", text: monkeyOut }
                ] 
            };
        } catch (e: any) {
            return {
                content: [
                    { type: "text", text: `Monkey terminated early (Crash detected?):` },
                    { type: "text", text: e.message || "Unknown error" }
                ],
                isError: true
            };
        }
    }

    if (name === "record_video") {
        const duration = (args?.durationSec as number) || 5;
        const platform = (args?.platform as string) || "android";
        const deviceId = args?.deviceId as string;
        
        if (duration > 60) throw new Error("Max duration is 60 seconds");

        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        const tempPath = path.join(os.tmpdir(), `rec_${Date.now()}.mp4`);

        if (platform === "android") {
            const adbArgs = deviceId ? ["-s", deviceId] : [];
            await run("adb", [...adbArgs, "shell", "screenrecord", "--time-limit", duration.toString(), "/sdcard/mcp_rec.mp4"]);
            await run("adb", [...adbArgs, "pull", "/sdcard/mcp_rec.mp4", tempPath]);
            await run("adb", [...adbArgs, "shell", "rm", "/sdcard/mcp_rec.mp4"]);
        } else if (platform === "ios") {
            if (!deviceId) throw new Error("deviceId required for iOS");
            const subprocess = execa("xcrun", ["simctl", "io", deviceId, "recordVideo", tempPath]);
            await new Promise(resolve => setTimeout(resolve, duration * 1000));
            subprocess.kill("SIGINT");
            try {
                await subprocess;
            } catch (e) {
                // Expected to exit with signal
            }
        }

        const videoBuffer = fs.readFileSync(tempPath);
        const base64 = videoBuffer.toString("base64");
        fs.unlinkSync(tempPath);

        return {
            content: [
                { type: "text", text: `Video recorded (${duration}s). Size: ${(base64.length/1024/1024).toFixed(2)} MB` },
                { type: "image", data: base64, mimeType: "video/mp4" }
            ]
        };
    }

    // --- iOS ---
    if (name.startsWith("ios_")) {
      const deviceId = args?.deviceId as string;
      if (!deviceId) throw new Error("deviceId (UDID) is required for iOS tools.");

      if (name === "ios_install") {
        const appPath = args?.appPath as string;
        await run("xcrun", ["simctl", "install", deviceId, appPath]);
        return { content: [{ type: "text", text: `Installed ${appPath} on ${deviceId}` }] };
      }

      if (name === "ios_screenshot") {
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        const tempFile = path.join(os.tmpdir(), `ios_screen_${Date.now()}.png`);

        await run("xcrun", ["simctl", "io", deviceId, "screenshot", tempFile]);
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);

        const base64 = buffer.toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;
        return {
          content: [
            { type: "text", text: "Screenshot captured:" },
            { type: "image", data: dataUrl, mimeType: "image/png" }
          ]
        };
      }

      if (name === "ios_launch") {
        const bundleId = args?.bundleId as string;
        await run("xcrun", ["simctl", "launch", deviceId, bundleId]);
        return { content: [{ type: "text", text: `Launched ${bundleId}` }] };
      }
    }

    return {
      content: [{ type: "text", text: `Tool ${name} not implemented.` }],
      isError: true,
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  // Print startup diagnostics
  console.error("╔════════════════════════════════════════════════════════╗");
  console.error("║    Mobile Device Farm MCP Server                       ║");
  console.error("╚════════════════════════════════════════════════════════╝");
  console.error("");
  
  if (hasAdb) {
    console.error("✓ ADB (Android Debug Bridge) detected");
  } else {
    console.error("✗ ADB not found. Android features will not work.");
    console.error("  Install Android SDK or ensure adb is in your PATH.");
  }
  
  if (hasXcode) {
    console.error("✓ Xcode tools (xcrun) detected - iOS Simulator support enabled");
  } else {
    console.error("✗ Xcode tools not found. iOS Simulator features will not work.");
    console.error("  Install Xcode Command Line Tools: xcode-select --install");
  }
  
  console.error("");
  console.error("Use 'list_devices' tool to see available devices.");
  console.error("─────────────────────────────────────────────────────────");
  console.error("");
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});