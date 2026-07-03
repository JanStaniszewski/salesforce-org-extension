// test/suite/index.ts
import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Default Mocha timeout (2000ms) is too short here: extension activation
  // shells out to `sf --version` (checkCliInstalled), and the sf CLI's cold
  // start can comfortably exceed 2s.
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 20000 });
  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/*.test.js', { cwd: testsRoot });
  files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
