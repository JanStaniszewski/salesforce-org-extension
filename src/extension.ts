// src/extension.ts
import * as vscode from 'vscode';
import { OrgService } from './services/orgService';
import { CategoryService } from './services/categoryService';
import { OrgTreeProvider } from './tree/orgTreeProvider';
import { checkCliInstalled } from './util/cliInstallCheck';
import { registerAuthorizeOrgCommand } from './commands/authorizeOrg';
import { registerOrgActionCommands } from './commands/orgActions';
import { registerCategoryCommands } from './commands/categoryCommands';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const cliInstalled = await checkCliInstalled();
  if (!cliInstalled) {
    void vscode.window
      .showErrorMessage(
        'Salesforce CLI ("sf") not found. Install it to use Salesforce Org Manager.',
        'Open installation instructions'
      )
      .then((choice) => {
        if (choice) {
          void vscode.env.openExternal(vscode.Uri.parse('https://developer.salesforce.com/tools/salesforcecli'));
        }
      });
    return;
  }

  const orgService = new OrgService(undefined, undefined, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
  const categoryService = new CategoryService();
  const treeProvider = new OrgTreeProvider(orgService, categoryService);

  context.subscriptions.push(vscode.window.registerTreeDataProvider('sfOrgManagerView', treeProvider));

  registerAuthorizeOrgCommand(context, orgService, treeProvider);
  registerOrgActionCommands(context, orgService, treeProvider);
  registerCategoryCommands(context, categoryService, treeProvider);
}

export function deactivate(): void {}
