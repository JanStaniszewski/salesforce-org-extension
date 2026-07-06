import { exec as nodeExec, ExecException } from 'child_process';

export type ExecFn = (
  command: string,
  options: { maxBuffer: number },
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
) => void;

export class CliError extends Error {
  constructor(message: string, public readonly raw?: unknown) {
    super(message);
    this.name = 'CliError';
  }
}

const MAX_BUFFER = 10 * 1024 * 1024;

export function runCli(command: string, execFn: ExecFn = nodeExec as ExecFn): Promise<string> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      if (error) {
        reject(new CliError(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

interface SfJsonEnvelope<T> {
  status: number;
  result?: T;
  message?: string;
}

export function runCliJson<T>(command: string, execFn: ExecFn = nodeExec as ExecFn): Promise<T> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      let parsed: SfJsonEnvelope<T>;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        reject(new CliError(stderr || error?.message || 'Failed to parse CLI response'));
        return;
      }
      if (parsed.status !== 0) {
        reject(new CliError(parsed.message || 'CLI command failed', parsed));
        return;
      }
      resolve(parsed.result as T);
    });
  });
}
