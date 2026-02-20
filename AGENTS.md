# GEMINI.md - Mobile Device Farm MCP 🚜📱

## Project Overview
Mobile Device Farm MCP is a **Model Context Protocol (MCP)** server that enables AI agents to interact directly with mobile devices. It provides a bridge to **Android devices** (via ADB) and **iOS Simulators** (via Xcode's `simctl`), allowing for automation, testing, and debugging tasks.

### Main Technologies
- **Runtime:** Node.js (TypeScript)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Shell Execution:** `execa` for robust command-line interaction.
- **Validation:** `zod` for input schema validation.
- **Detection:** Automatic discovery of Android SDK and Xcode tools.

### Core Architecture
The server follows a standard MCP pattern:
- **Discovery:** `list_devices` identifies available ADB serials and booted iOS UDIDs.
- **Tools:** Specialized handlers for `adb` and `xcrun simctl` commands.
- **Transport:** Standard input/output (StdioServerTransport) for communication with MCP clients.

---

## Building and Running

### Key Commands
- **Build:** `npm run build`
  - Compiles TypeScript to JavaScript in the `dist/` directory.
- **Start (Production):** `npm start`
  - Runs the compiled server from `dist/index.js`.
- **Development:** `npm run dev`
  - Runs the server directly from `src/index.ts` using `tsx` (hot-reloading equivalent).
- **Test:** `npm test`
  - *Current Status:* Placeholder (TODO: Implement automated tests).

### Prerequisites
- **Android:** `adb` installed and in PATH (or standard SDK locations).
- **iOS:** macOS with Xcode and Command Line Tools installed.

---

## Development Conventions

### Continuous Improvement Workflow
- **No Direct Pushes:** Never push changes directly to the `main` branch.
- **Pull Requests:** All changes must be submitted via a Pull Request (PR).
- **PR Descriptions:** Every PR must include a comprehensive description covering:
  - **Why:** The rationale for the change and the problem it solves.
  - **What:** A high-level summary of the implementation details.
- **Verification:** All PRs must pass build and lint checks before being considered for merging.

### Coding Style
- **TypeScript:** Strict typing is preferred.
- **Tool Definitions:** All tools are defined in the `TOOLS` array within `src/index.ts`.
- **Error Handling:** Use `try/catch` blocks around shell executions. The `run` helper function handles basic execution and error reporting.
- **Input Validation:** Use MCP's `inputSchema` (JSON Schema) to define and validate tool arguments.

### Adding New Tools
1. Define the tool metadata (name, description, schema) in the `TOOLS` array in `src/index.ts`.
2. Add a corresponding `if (name === "...")` block in the `CallToolRequestSchema` handler.
3. Use the `run` helper or `execa` directly for shell commands.
4. For binary data (like screenshots or video), return Base64 encoded strings with the appropriate MIME type.

### Testing Practices
- Currently, testing is performed manually by connecting the server to an MCP client (e.g., Claude Desktop, Codex).
- Future implementations should include unit tests for the helper functions and integration tests for command generation.

---

## Directory Structure
- `src/index.ts`: The main entry point containing all MCP logic, tool definitions, and command handlers.
- `dist/`: Compiled JavaScript output (generated after `npm run build`).
- `package.json`: Project metadata, dependencies, and scripts.
- `tsconfig.json`: TypeScript configuration.
