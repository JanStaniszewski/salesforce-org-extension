// src/commands/authorizeOrg.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';

const INSTANCE_URLS: Record<string, string> = {
  Production: 'https://login.salesforce.com',
  Sandbox: 'https://test.salesforce.com',
};

export function registerAuthorizeOrgCommand(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  const disposable = vscode.commands.registerCommand('sfOrgManager.authorizeOrg', async () => {
    const orgTypePick = await vscode.window.showQuickPick(['Production', 'Sandbox', 'Custom URL'], {
      placeHolder: 'Select the org type to authorize',
    });
    if (!orgTypePick) {
      return;
    }

    let instanceUrl: string;
    if (orgTypePick === 'Custom URL') {
      const customUrl = await vscode.window.showInputBox({
        prompt: 'Enter the instance URL (e.g. https://mydomain.my.salesforce.com)',
      });
      if (!customUrl) {
        return;
      }
      instanceUrl = customUrl;
    } else {
      instanceUrl = INSTANCE_URLS[orgTypePick];
    }

    const alias = await vscode.window.showInputBox({
      prompt: 'Alias for the org (optional, leave blank to let the CLI generate one)',
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Waiting for browser authorization...',
        cancellable: true,
      },
      async (_progress, token) => {
        const controller = new AbortController();
        const cancelListener = token.onCancellationRequested(() => controller.abort());
        try {
          await orgService.loginWeb(alias || undefined, instanceUrl, controller.signal);
          treeProvider.refresh();
          void vscode.window.showInformationMessage(`Org${alias ? ` "${alias}"` : ''} authorized successfully.`);
        } catch (error) {
          if (!token.isCancellationRequested) {
            void vscode.window.showErrorMessage(`Authorization failed: ${(error as Error).message}`);
          }
        } finally {
          cancelListener.dispose();
        }
      }
    );
  });
  context.subscriptions.push(disposable);
}
