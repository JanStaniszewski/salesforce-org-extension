// test/runTest.ts
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    // Pinned to match engines.vscode: @vscode/test-electron's macOS executable
    // resolver hardcodes Contents/MacOS/Electron, but VS Code's "latest stable"
    // build renamed its real executable to Contents/MacOS/Code, leaving a stub
    // Electron binary that rejects every CLI flag ("bad option"). Older builds
    // still ship Electron as the real entry point, so pin to one of those.
    await runTests({ extensionDevelopmentPath, extensionTestsPath, version: '1.85.0' });
  } catch (err) {
    console.error('Failed to run integration tests', err);
    process.exit(1);
  }
}

main();
