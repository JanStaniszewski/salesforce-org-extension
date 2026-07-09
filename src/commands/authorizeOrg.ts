// src/commands/authorizeOrg.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { withCancellableProgress } from '../util/cancellableProgress';

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

    try {
      const result = await withCancellableProgress('Waiting for browser authorization...', (signal) =>
        orgService.loginWeb(alias || undefined, instanceUrl, signal)
      );
      if (result.cancelled) {
        return;
      }
      treeProvider.refresh();
      void vscode.window.showInformationMessage(`✅ Org${alias ? ` "${alias}"` : ''} authorized successfully.`);
    } catch (error) {
      void vscode.window.showErrorMessage(`❌ Authorization failed: ${(error as Error).message}`);
    }
  });
  context.subscriptions.push(disposable);
}
