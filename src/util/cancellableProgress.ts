import * as vscode from 'vscode';

export type CancellableResult<T> = { cancelled: true } | { cancelled: false; value: T };

export async function withCancellableProgress<T>(
  title: string,
  action: (signal: AbortSignal) => Promise<T>
): Promise<CancellableResult<T>> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title, cancellable: true },
    async (_progress, token): Promise<CancellableResult<T>> => {
      const controller = new AbortController();
      const cancelListener = token.onCancellationRequested(() => controller.abort());
      try {
        const value = await action(controller.signal);
        return { cancelled: false, value };
      } catch (error) {
        if (token.isCancellationRequested) {
          return { cancelled: true };
        }
        throw error;
      } finally {
        cancelListener.dispose();
      }
    }
  );
}
