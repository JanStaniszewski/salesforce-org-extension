// src/commands/orgActions.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { OrgSummary, OrgType } from '../models/org';
import { OrgItem, toOrgSummary } from '../tree/treeItems';

export function registerOrgActionCommands(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.setDefault', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      try {
        await orgService.setDefault(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`"${org.alias ?? org.username}" set as default.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Failed to set default org: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.openInBrowser', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      try {
        await orgService.openInBrowser(org.username);
      } catch (error) {
        void vscode.window.showErrorMessage(`Failed to open org: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.logout', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const confirmed = await vscode.window.showWarningMessage(
        `Are you sure you want to log out of "${org.alias ?? org.username}"?`,
        { modal: true },
        'Log Out'
      );
      if (confirmed !== 'Log Out') {
        return;
      }
      try {
        await orgService.logout(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Logged out of "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Logout failed: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refreshToken', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const instanceUrl = org.orgType === OrgType.Sandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
      try {
        await orgService.loginWeb(org.alias, instanceUrl);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Token refreshed for "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Token refresh failed: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.copyAuthUrl', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      try {
        const authUrl = await orgService.getAuthUrl(org.username);
        await vscode.env.clipboard.writeText(authUrl);
        void vscode.window.showInformationMessage(
          `Auth URL for "${org.alias ?? org.username}" copied to clipboard. Treat it like a password.`
        );
      } catch (error) {
        void vscode.window.showErrorMessage(`Failed to copy Auth URL: ${(error as Error).message}`);
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
