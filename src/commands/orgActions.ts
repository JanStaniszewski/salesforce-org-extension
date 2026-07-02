// src/commands/orgActions.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { OrgSummary, OrgType } from '../models/org';

export function registerOrgActionCommands(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.setDefault', async (org: OrgSummary) => {
      try {
        await orgService.setDefault(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`"${org.alias ?? org.username}" ustawiona jako domyślna.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Nie udało się ustawić domyślnej orgi: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.openInBrowser', async (org: OrgSummary) => {
      try {
        await orgService.openInBrowser(org.username);
      } catch (error) {
        void vscode.window.showErrorMessage(`Nie udało się otworzyć orgi: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.logout', async (org: OrgSummary) => {
      const confirmed = await vscode.window.showWarningMessage(
        `Na pewno wylogować "${org.alias ?? org.username}"?`,
        { modal: true },
        'Wyloguj'
      );
      if (confirmed !== 'Wyloguj') {
        return;
      }
      try {
        await orgService.logout(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Wylogowano z "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Wylogowanie nie powiodło się: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refreshToken', async (org: OrgSummary) => {
      const instanceUrl = org.orgType === OrgType.Sandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
      try {
        await orgService.loginWeb(org.alias, instanceUrl);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Token odświeżony dla "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Odświeżenie tokena nie powiodło się: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refresh', () => {
      orgService.invalidateOrgList();
      treeProvider.refresh();
    })
  );
}
