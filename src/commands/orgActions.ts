// src/commands/orgActions.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { OrgSummary, OrgType } from '../models/org';
import { OrgItem, toOrgSummary } from '../tree/treeItems';
import { withCancellableProgress } from '../util/cancellableProgress';

export function registerOrgActionCommands(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.setDefault', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const label = org.alias ?? org.username;
      try {
        const result = await withCancellableProgress(`Setting "${label}" as default org...`, (signal) =>
          orgService.setDefault(org.username, signal)
        );
        if (result.cancelled) {
          return;
        }
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`✅ "${label}" set as default.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`❌ Failed to set default org: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.openInBrowser', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const label = org.alias ?? org.username;
      try {
        const result = await withCancellableProgress(`Opening "${label}" in browser...`, (signal) =>
          orgService.openInBrowser(org.username, signal)
        );
        if (result.cancelled) {
          return;
        }
      } catch (error) {
        void vscode.window.showErrorMessage(`❌ Failed to open org: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.logout', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const label = org.alias ?? org.username;
      const confirmed = await vscode.window.showWarningMessage(
        `Are you sure you want to log out of "${label}"?`,
        { modal: true },
        'Log Out'
      );
      if (confirmed !== 'Log Out') {
        return;
      }
      try {
        const result = await withCancellableProgress(`Logging out of "${label}"...`, (signal) =>
          orgService.logout(org.username, signal)
        );
        if (result.cancelled) {
          return;
        }
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`✅ Logged out of "${label}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`❌ Logout failed: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refreshToken', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const label = org.alias ?? org.username;
      const instanceUrl = org.orgType === OrgType.Sandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
      try {
        const result = await withCancellableProgress('Waiting for browser authorization...', (signal) =>
          orgService.loginWeb(org.alias, instanceUrl, signal)
        );
        if (result.cancelled) {
          return;
        }
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`✅ Token refreshed for "${label}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`❌ Token refresh failed: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.copyAuthUrl', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const label = org.alias ?? org.username;
      try {
        const result = await withCancellableProgress(`Fetching Auth URL for "${label}"...`, (signal) =>
          orgService.getAuthUrl(org.username, signal)
        );
        if (result.cancelled) {
          return;
        }
        await vscode.env.clipboard.writeText(result.value);
        void vscode.window.showInformationMessage(`✅ Auth URL for "${label}" copied to clipboard. Treat it like a password.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`❌ Failed to copy Auth URL: ${(error as Error).message}`);
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
