# Mobile Device Farm MCP 🚜📱

A Model Context Protocol (MCP) server that gives AI agents direct control over Android devices (via ADB) and iOS Simulators.

## Features

- **List Devices:** See all connected Android devices and booted iOS Simulators.
- **Install & Launch:** Push APKs/IPAs and start apps.
- **Screenshots:** Capture screen content (returns as base64 image to the agent).
- **Logs:** Fetch `logcat` or system logs.
- **Touch:** Simulate taps on Android (iOS touch simulation requires more complex setup like `idb`, currently supported via standard Xkcd simctl for basic ops).
- **File Management:** Push/Pull files on Android and add media to iOS Simulators.

## Prerequisites
- **Auto-Detect:** The server attempts to find `adb` in standard macOS/Linux locations if not in PATH.

1.  **Android:**
    - `adb` must be installed and in your system PATH.
    - Devices must be connected and authorized (`adb devices`).
2.  **iOS (macOS only):**
    - Xcode and Command Line Tools installed (`xcode-select --install`).
    - Simulators must be booted (`xcrun simctl boot <UUID>`).

## Installation

### Option 1: Using npx (Recommended - No install required)
```bash
npx mobile-device-farm-mcp
```

### Option 2: Global installation
```bash
npm install -g mobile-device-farm-mcp
mobile-device-farm-mcp
```

### Option 3: Clone and build locally
```bash
git clone https://github.com/MarcoCarnevali/mobile-device-farm-mcp.git
cd mobile-device-farm-mcp
npm install
npm run build
```

## MCP Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

### Option A: Using npx (Recommended)
```json
{
  "mcpServers": {
    "device-farm": {
      "command": "npx",
      "args": ["-y", "mobile-device-farm-mcp"]
    }
  }
}
```

### Option B: Using global install
```json
{
  "mcpServers": {
    "device-farm": {
      "command": "mobile-device-farm-mcp"
    }
  }
}
```

### Option C: Local install
If you cloned the repo, use the local path:
```json
{
  "mcpServers": {
    "device-farm": {
      "command": "node",
      "args": ["/path/to/mobile-device-farm-mcp/dist/index.js"]
    }
  }
}
```

### Option D: Codex CLI
Add to your `~/.codex/config.yaml`:
```yaml
mcpServers:
  device-farm:
    command: npx
    args: ["-y", "mobile-device-farm-mcp"]
```

Or with global install:
```yaml
mcpServers:
  device-farm:
    command: mobile-device-farm-mcp
```

### Option E: Codex App (macOS)
In the Codex app, go to Settings > MCP Servers and add:
- **Name:** device-farm
- **Command:** `npx -y mobile-device-farm-mcp`

Or if installed globally:
- **Command:** `mobile-device-farm-mcp`

**Note:** The server automatically detects Android SDK and Xcode tools in standard locations.

## Mobile Tester Skill 🧠

To teach your AI agent how to effectively use these tools for complex testing workflows (like smoke tests, crash reproduction, and chaos engineering), load the **Mobile Tester Skill**.

**How to use:**
1.  **Gemini CLI:** Run `gemini skill add skills/mobile-tester.md` (or simply reference the file in your prompt).
2.  **Other Agents (Claude/Codex):** Copy the content of `skills/mobile-tester.md` into your system prompt or upload it as a context file.

This skill provides "recipes" for:
- 🕵️ **Smoke Testing:** Clean install -> Launch -> Verify.
- 💥 **Crash Reproduction:** Log clearing -> Recording -> Action -> Analysis.
- 🌐 **Offline Mode:** Toggling WiFi to test error handling.
- 🐵 **Chaos Testing:** Running the Android Monkey fuzzer.

## Tools
- `analyze_logs(deviceId, mode)`: Get logs filtered by mode (crash, anr, network).
- `open_deep_link(url, deviceId, platform)`: Open a URL or Deep Link (Android/iOS).
- `run_monkey(packageName, events)`: Run Chaos Monkey stress test (Android).
- `record_video(deviceId, durationSec)`: Record screen (Android/iOS).
- `adb_push(localPath, remotePath)`: Push a file to Android.
- `adb_pull(remotePath, localPath)`: Pull a file from Android.
- `ios_add_media(localPath)`: Add photos/videos to iOS Simulator.
- `list_devices`: List all available targets.
- `adb_install(apkPath)`: Install an APK.
- `adb_screenshot(deviceId)`: See what's on screen.
- `adb_tap(x, y)`: Touch the screen.
- `get_device_info(deviceId)`: Get battery, SDK version, resolution.
- `get_app_vitals(packageName)`: Check CPU and Memory usage.
- `ios_install(appPath)`: Install an .app bundle on Simulator.
- `ios_launch(bundleId)`: Start an app.

## License

MIT
