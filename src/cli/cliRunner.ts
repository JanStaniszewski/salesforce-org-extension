import { spawn, ChildProcess, ExecException } from 'child_process';

export type ExecFn = (
  command: string,
  options: { maxBuffer: number; signal?: AbortSignal; cwd?: string },
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
) => void;

export type ExecFileFn = (
  file: string,
  args: string[],
  options: { maxBuffer: number; signal?: AbortSignal; cwd?: string },
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
) => void;

export class CliError extends Error {
  constructor(message: string, public readonly raw?: unknown) {
    super(message);
    this.name = 'CliError';
  }
}

const MAX_BUFFER = 10 * 1024 * 1024;

// `sf` resolves to a bash/cmd wrapper script that launches the real Node
// process as its own child (without exec-replacing itself), so killing just
// the wrapper's PID orphans the actual CLI process - which is fatal for
// `org login web`, since the orphan keeps holding the local OAuth redirect
// server's port open and blocks every future login attempt. Spawning
// detached and killing the whole process group (POSIX) / process tree
// (Windows) reaches that orphan too.
function killProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F']).unref();
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // process group may already be gone
  }
  const forceKill = setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }, 2000);
  forceKill.unref();
}

function collectChildOutput(
  child: ChildProcess,
  label: string,
  signal: AbortSignal | undefined,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
): void {
  let stdout = '';
  let stderr = '';
  let settled = false;

  const onAbort = () => {
    if (child.pid) {
      killProcessTree(child.pid);
    }
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  const finish = (error: ExecException | null): void => {
    if (settled) {
      return;
    }
    settled = true;
    signal?.removeEventListener('abort', onAbort);
    callback(error, stdout, stderr);
  };

  child.stdout?.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk;
  });
  child.on('error', (error) => finish(error as ExecException));
  child.on('close', (code) => {
    if (signal?.aborted) {
      const abortError = new Error('The operation was aborted') as ExecException;
      abortError.name = 'AbortError';
      finish(abortError);
      return;
    }
    if (code !== 0) {
      const error = new Error(`${label} exited with code ${code}`) as ExecException;
      error.code = code ?? undefined;
      finish(error);
      return;
    }
    finish(null);
  });
}

const defaultExecFn: ExecFn = (command, options, callback) => {
  const child = spawn(command, { shell: true, detached: process.platform !== 'win32', cwd: options.cwd });
  collectChildOutput(child, command, options.signal, callback);
};

const defaultExecFileFn: ExecFileFn = (file, args, options, callback) => {
  const child = spawn(file, args, { detached: process.platform !== 'win32', cwd: options.cwd });
  collectChildOutput(child, file, options.signal, callback);
};

export function runCli(
  command: string,
  execFn: ExecFn = defaultExecFn,
  signal?: AbortSignal,
  cwd?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER, signal, cwd }, (error, stdout, stderr) => {
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

export function runCliJson<T>(
  command: string,
  execFn: ExecFn = defaultExecFn,
  signal?: AbortSignal,
  cwd?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER, signal, cwd }, (error, stdout, stderr) => {
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

export function runCliFileJson<T>(
  file: string,
  args: string[],
  execFileFn: ExecFileFn = defaultExecFileFn,
  signal?: AbortSignal,
  cwd?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    execFileFn(file, args, { maxBuffer: MAX_BUFFER, signal, cwd }, (error, stdout, stderr) => {
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
