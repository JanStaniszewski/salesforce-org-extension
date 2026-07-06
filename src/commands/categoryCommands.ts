// src/commands/categoryCommands.ts
import * as vscode from 'vscode';
import { CategoryService } from '../services/categoryService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { OrgSummary } from '../models/org';
import { OrgItem, toOrgSummary } from '../tree/treeItems';

const CREATE_NEW_LABEL = '$(add) Create new...';

export function registerCategoryCommands(
  context: vscode.ExtensionContext,
  categoryService: CategoryService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.assignCategory', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      const existing = categoryService.listCategories();
      const pick = await vscode.window.showQuickPick([CREATE_NEW_LABEL, ...existing], {
        placeHolder: `Assign "${org.alias ?? org.username}" to a project/category`,
      });
      if (!pick) {
        return;
      }
      let category = pick;
      if (pick === CREATE_NEW_LABEL) {
        const newCategory = await vscode.window.showInputBox({ prompt: 'New category/project name' });
        if (!newCategory) {
          return;
        }
        category = newCategory;
      }
      categoryService.assignCategory(org.username, category);
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.removeCategory', (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      categoryService.removeCategory(org.username);
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.toggleGroupMode', () => {
      treeProvider.setGroupMode(treeProvider.getGroupMode() === 'type' ? 'category' : 'type');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.filterByCategory', async () => {
      const existing = categoryService.listCategories();
      if (existing.length === 0) {
        void vscode.window.showInformationMessage('No categories defined yet.');
        return;
      }
      const pick = await vscode.window.showQuickPick(existing, { placeHolder: 'Filter by category' });
      if (!pick) {
        return;
      }
      treeProvider.setCategoryFilter(pick);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.clearCategoryFilter', () => {
      treeProvider.setCategoryFilter(undefined);
    })
  );
}
