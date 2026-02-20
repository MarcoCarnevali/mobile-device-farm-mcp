# Mobile Tester Skill

This skill teaches an AI agent how to effectively use the `mobile-device-farm-mcp` server to test Android and iOS applications. It covers discovery, state management, interaction, and debugging workflows.

## 1. Discovery & Setup
Before running any test, you must identify the target device.

- **List Devices:** ALWAYS start by running `list_devices({ platform: "all" })`.
- **Select Target:**
  - If multiple devices are found, ask the user which one to target.
  - Store the `deviceId` (ADB Serial or iOS UDID) for subsequent commands.

## 2. Standard Test Workflows

### A. "Fresh Install" / Smoke Test
Use this flow to verify a clean installation.
1. **Uninstall/Clear:** Ensure a clean slate.
   - Android: `adb_clear_app_data(packageName)` (preferred) or `adb_uninstall`.
   - iOS: `ios_uninstall(bundleId)`.
2. **Install:**
   - Android: `adb_install(apkPath)`.
   - iOS: `ios_install(appPath)`.
3. **Launch:**
   - Android: `adb_shell({ command: "monkey -p <pkg> -c android.intent.category.LAUNCHER 1" })` or use `open_deep_link`.
   - iOS: `ios_launch(bundleId)`.
4. **Verify:**
   - Take a screenshot: `adb_screenshot` / `ios_screenshot`.
   - Check if the app process is running (via `get_app_vitals` or `ps`).

### B. Reproducing a Crash
1. **Prepare:**
   - Clear logs: `adb_logcat({ lines: 100, filter: "-c" })` (if supported) or just note the time.
   - Start Video Recording (Optional): `record_video({ durationSec: 30 })`.
2. **Execute Steps:**
   - Perform the user actions using `adb_tap`, `adb_swipe`, `adb_input_text`.
   - Use `adb_key_event` for Back/Home navigation.
3. **Capture Evidence:**
   - If the app disappears, run `get_app_vitals` to check if it's running or crashed.
   - Run `analyze_logs({ mode: "crash" })` to extract the stack trace.
   - Save the video/screenshot.

### C. Deep Link Verification
1. **Launch URL:**
   - Use `open_deep_link({ url: "myapp://page?id=123" })`.
2. **Verify:**
   - Wait 2-3 seconds.
   - Take a screenshot to confirm the correct page loaded.

## 3. Advanced Debugging (Android)

### Network Testing (Offline Mode)
1. **Go Offline:** `adb_wifi({ enabled: false })`.
2. **Action:** Perform the action that requires network.
3. **Verify:** Check if the app shows an appropriate "No Internet" error message (Screenshot).
4. **Restore:** `adb_wifi({ enabled: true })`.
5. **Verify Recovery:** specific action to retry network call.

### Stress Testing (Chaos Monkey)
- Run `run_monkey({ packageName, events: 1000 })` to fuzz-test the UI.
- Afterwards, check `analyze_logs({ mode: "crash" })`.

## 4. Best Practices
- **Wait Times:** Mobile devices can be slow. After launching an app or navigating, wait 1-2 seconds before the next action (or take a screenshot to poll state).
- **Errors:** If a command fails (e.g., "Element not found"), try to take a screenshot to understand the current UI state before retrying.
- **Cleanup:** Always offer to uninstall or clear data after a test session to leave the device clean.
