// src/tree/orgTreeProvider.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { CategoryService } from '../services/categoryService';
import { OrgSummary, ConnectionStatus } from '../models/org';
import { groupOrgsByType, groupOrgsByCategory, filterByCategory } from './grouping';
import { OrgGroupItem, OrgItem, OrgDetailItem, OrgActionItem } from './treeItems';

export type GroupMode = 'type' | 'category';

type TreeNode = OrgGroupItem | OrgItem | OrgDetailItem | OrgActionItem;

export class OrgTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groupMode: GroupMode = 'type';
  private categoryFilter: string | undefined;

  constructor(private readonly orgService: OrgService, private readonly categoryService: CategoryService) {}

  setGroupMode(mode: GroupMode): void {
    this.groupMode = mode;
    this.refresh();
  }

  setCategoryFilter(category: string | undefined): void {
    this.categoryFilter = category;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    try {
      if (!element) {
        return await this.getRootGroups();
      }
      if (element instanceof OrgGroupItem) {
        return element.orgs.map((org) => new OrgItem(org));
      }
      if (element instanceof OrgItem) {
        return await this.getOrgChildren(element.org);
      }
      return [];
    } catch (error) {
      void vscode.window.showErrorMessage(`Nie udało się pobrać listy orgów: ${(error as Error).message}`);
      return [];
    }
  }

  private async getRootGroups(): Promise<OrgGroupItem[]> {
    let orgs = await this.orgService.listOrgs();
    if (this.categoryFilter) {
      orgs = filterByCategory(orgs, this.categoryFilter, (u) => this.categoryService.getCategory(u));
    }
    const groups =
      this.groupMode === 'type'
        ? groupOrgsByType(orgs)
        : groupOrgsByCategory(orgs, (u) => this.categoryService.getCategory(u));
    return groups.map((g) => new OrgGroupItem(g.groupName, g.orgs));
  }

  private async getOrgChildren(org: OrgSummary): Promise<TreeNode[]> {
    const details = await this.orgService.getOrgDetails(org.username);
    const items: TreeNode[] = [
      new OrgDetailItem('Org ID', details.orgId),
      new OrgDetailItem('Instance URL', details.instanceUrl),
      new OrgDetailItem('API Version', details.apiVersion),
    ];
    if (details.expirationDate) {
      items.push(new OrgDetailItem('Wygasa', details.expirationDate));
    }
    items.push(new OrgActionItem('Ustaw jako domyślną', 'arrow-swap', 'sfOrgManager.setDefault', org));
    items.push(new OrgActionItem('Otwórz w przeglądarce', 'link-external', 'sfOrgManager.openInBrowser', org));
    if (org.status === ConnectionStatus.Expired) {
      items.push(new OrgActionItem('Odśwież token', 'refresh', 'sfOrgManager.refreshToken', org));
    }
    return items;
  }
}
