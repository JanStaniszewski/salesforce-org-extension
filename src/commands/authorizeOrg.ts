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
      placeHolder: 'Wybierz typ orgi do autoryzacji',
    });
    if (!orgTypePick) {
      return;
    }

    let instanceUrl: string;
    if (orgTypePick === 'Custom URL') {
      const customUrl = await vscode.window.showInputBox({
        prompt: 'Podaj instance URL (np. https://mydomain.my.salesforce.com)',
      });
      if (!customUrl) {
        return;
      }
      instanceUrl = customUrl;
    } else {
      instanceUrl = INSTANCE_URLS[orgTypePick];
    }

    const alias = await vscode.window.showInputBox({
      prompt: 'Alias dla orgi (opcjonalnie, zostaw puste żeby CLI wygenerowało)',
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Czekam na autoryzację w przeglądarce...',
        cancellable: false,
      },
      async () => {
        try {
          await orgService.loginWeb(alias || undefined, instanceUrl);
          treeProvider.refresh();
          void vscode.window.showInformationMessage(`Orga${alias ? ` "${alias}"` : ''} została zautoryzowana.`);
        } catch (error) {
          void vscode.window.showErrorMessage(`Autoryzacja nie powiodła się: ${(error as Error).message}`);
        }
      }
    );
  });
  context.subscriptions.push(disposable);
}
