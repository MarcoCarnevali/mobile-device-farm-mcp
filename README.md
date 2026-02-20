# Mobile Device Farm MCP 🚜📱

[![CI](https://github.com/MarcoCarnevali/mobile-device-farm-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcoCarnevali/mobile-device-farm-mcp/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/mobile-device-farm-mcp)](https://www.npmjs.com/package/mobile-device-farm-mcp)

A Model Context Protocol (MCP) server that gives AI agents direct control over **Android devices** (via ADB) and **iOS Simulators** (via simctl). Perform automated testing, bug reproduction, and performance profiling directly from your AI agent.

---

## 🚀 Quick Start (via npx)

The easiest way to start the server is using `npx`. No installation required:

```bash
npx -y mobile-device-farm-mcp
```

Add it to your Claude Desktop configuration:
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

---

## 🛠️ Tools & Capabilities

The server provides a comprehensive suite of tools categorized by platform.

### 🌍 Common Tools (Cross-Platform)
- **`list_devices(platform)`**: See all connected Android devices and booted iOS Simulators.
- **`test_performance(packageName, durationSec, platform)`**: Measure average/max CPU and Memory usage over time.
- **`open_deep_link(url, deviceId, platform)`**: Open a URL or Deep Link on the target device.
- **`record_video(deviceId, durationSec, platform)`**: Record a short video of the screen (up to 60s).
- **`analyze_logs(deviceId, mode)`**: Fetch and filter logs by `crash`, `anr`, or `network`.

### 🤖 Android Tools (ADB)
- **`adb_screenshot(deviceId)`**: Capture the screen as a base64 image.
- **`adb_get_ui_hierarchy(deviceId)`**: Get the raw XML structure of the current screen (essential for finding element coordinates).
- **`adb_tap(x, y)`** / **`adb_swipe(x1, y1, x2, y2)`**: Simulate touch interactions.
- **`adb_input_text(text)`**: Type text into the focused field.
- **`adb_key_event(keycode)`**: Send hardware keys (HOME, BACK, ENTER).
- **`adb_install(apkPath)`** / **`adb_clear_app_data(packageName)`**: Manage app lifecycle.
- **`adb_grant_permissions(packageName, permissions)`**: Bypass system permission dialogs.
- **`adb_push(localPath, remotePath)`** / **`adb_pull(remotePath, localPath)`**: File management.
- **`adb_wifi(enabled)`**: Toggle WiFi to test offline behavior.

### 🍎 iOS Tools (Simulators)
- **`ios_screenshot(deviceId)`**: Capture Simulator screen.
- **`ios_launch(bundleId)`** / **`ios_terminate(bundleId)`**: Start or force-quit apps.
- **`ios_install(appPath)`** / **`ios_uninstall(bundleId)`**: Install/Remove apps.
- **`ios_add_media(localPath)`**: Add photos or videos to the Simulator library.
- **`ios_push_notification(bundleId, payload)`**: Send a test push notification (APNs JSON).

---

## 🧠 AI Agent Workflows (Examples)

### 🕵️ Example 1: Finding a Button via UI Hierarchy
Instead of guessing coordinates, the agent can use the UI hierarchy:
1. **Agent calls:** `adb_get_ui_hierarchy()`
2. **Result:** `<node text="Submit" bounds="[450,1200][630,1300]" ... />`
3. **Agent calls:** `adb_tap({ x: 540, y: 1250 })` (clicks the center of the bounds).

### 💥 Example 2: Reproducing a Crash
1. **Agent calls:** `adb_clear_app_data({ packageName: "com.myapp" })`
2. **Agent calls:** `record_video({ durationSec: 15 })`
3. **Agent performs interactions...**
4. **Agent calls:** `analyze_logs({ mode: "crash" })` to get the stack trace.

---

## 💬 Prompting Examples

Once the server is connected, you can talk to your AI agent like a human mobile engineer:

- **Smoke Test:** *"Install the latest APK from the 'builds' folder, launch it, and take a screenshot to make sure it doesn't crash on start."*
- **Bug Hunt:** *"Check the Android logs for any FATAL EXCEPTIONS related to the package 'com.example.app' in the last 500 lines."*
- **Deep Linking:** *"Open the deep link 'myapp://settings/profile' on the iOS simulator and tell me if the Profile page is displayed."*
- **Performance:** *"Run a 30-second performance test on 'com.android.chrome' and give me a summary of its average CPU and Memory usage."*
- **UI Inspection:** *"I need to click the 'Login' button but I don't know the coordinates. Inspect the UI hierarchy and find it for me."*

---

## 🧠 Mobile Tester Skill 

To teach your AI agent how to effectively use these tools for complex testing (like smoke tests and chaos engineering), load the **Mobile Tester Skill**.

**How to use:**
1.  **Gemini CLI:** Run `gemini skill add skills/mobile-tester.md`.
2.  **Other Agents:** Copy the content of `skills/mobile-tester.md` into your agent's system prompt.

---

## 🔧 Prerequisites

- **Android:** `adb` must be installed and authorized (`adb devices`).
- **iOS:** macOS with Xcode and Command Line Tools installed (`xcode-select --install`). Simulators must be **booted** to be detected.

## 📝 License

MIT
