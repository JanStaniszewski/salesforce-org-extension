import { runCli, ExecFn } from '../cli/cliRunner';

export async function checkCliInstalled(execFn?: ExecFn): Promise<boolean> {
  try {
    await runCli('sf --version', execFn);
    return true;
  } catch {
    return false;
  }
}
