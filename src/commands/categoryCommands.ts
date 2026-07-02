// src/commands/categoryCommands.ts
import * as vscode from 'vscode';
import { CategoryService } from '../services/categoryService';
import { OrgTreeProvider, GroupMode } from '../tree/orgTreeProvider';
import { OrgSummary } from '../models/org';

const CREATE_NEW_LABEL = '$(add) Utwórz nową...';

export function registerCategoryCommands(
  context: vscode.ExtensionContext,
  categoryService: CategoryService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.assignCategory', async (org: OrgSummary) => {
      const existing = categoryService.listCategories();
      const pick = await vscode.window.showQuickPick([CREATE_NEW_LABEL, ...existing], {
        placeHolder: `Przypisz "${org.alias ?? org.username}" do projektu/kategorii`,
      });
      if (!pick) {
        return;
      }
      let category = pick;
      if (pick === CREATE_NEW_LABEL) {
        const newCategory = await vscode.window.showInputBox({ prompt: 'Nazwa nowej kategorii/projektu' });
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
    vscode.commands.registerCommand('sfOrgManager.removeCategory', (org: OrgSummary) => {
      categoryService.removeCategory(org.username);
      treeProvider.refresh();
    })
  );

  let groupMode: GroupMode = 'type';
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.toggleGroupMode', () => {
      groupMode = groupMode === 'type' ? 'category' : 'type';
      treeProvider.setGroupMode(groupMode);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.filterByCategory', async () => {
      const existing = categoryService.listCategories();
      if (existing.length === 0) {
        void vscode.window.showInformationMessage('Brak zdefiniowanych kategorii.');
        return;
      }
      const pick = await vscode.window.showQuickPick(existing, { placeHolder: 'Filtruj wg kategorii' });
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
