# Mobile Device Farm MCP 🚜📱

A Model Context Protocol (MCP) server that gives AI agents direct control over Android devices (via ADB) and iOS Simulators.

## Features

- **List Devices:** See all connected Android devices and booted iOS Simulators.
- **Install & Launch:** Push APKs/IPAs and start apps.
- **Screenshots:** Capture screen content (returns as base64 image to the agent).
- **Logs:** Fetch `logcat` or system logs.
- **Touch:** Simulate taps on Android (iOS touch simulation requires more complex setup like `idb`, currently supported via standard Xkcd simctl for basic ops).

## Prerequisites
- **Auto-Detect:** The server attempts to find `adb` in standard macOS/Linux locations if not in PATH.

1.  **Android:**
    - `adb` must be installed and in your system PATH.
    - Devices must be connected and authorized (`adb devices`).
2.  **iOS (macOS only):**
    - Xcode and Command Line Tools installed (`xcode-select --install`).
    - Simulators must be booted (`xcrun simctl boot <UUID>`).

## Setup

1.  Clone this repo.
2.  Install dependencies:
    ```bash
    npm install
    npm run build
    ```
3.  Add to your Agent configuration (e.g., Claude Desktop config):
    ```json
    {
      "mcpServers": {
        "device-farm": {
          "command": "node",
          "args": ["/path/to/device-farm-mcp/dist/index.js"],
          "env": {
            "PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:/Users/yourname/Library/Android/sdk/platform-tools"
          }
        }
      }
    }
    ```
    **Note:** You MUST pass the correct `PATH` environment variable so the script can find `adb` and `xcrun`.

## Tools
- `analyze_logs(deviceId, mode)`: Get logs filtered by mode (crash, anr, network).
- `open_deep_link(url, deviceId, platform)`: Open a URL or Deep Link (Android/iOS).
- `set_network_condition(deviceId, condition)`: Set wifi/data/offline (Android).
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
