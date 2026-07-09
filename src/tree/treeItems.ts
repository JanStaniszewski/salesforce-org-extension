// src/tree/treeItems.ts
import * as vscode from 'vscode';
import { OrgSummary, ConnectionStatus } from '../models/org';

export class OrgGroupItem extends vscode.TreeItem {
  constructor(public readonly groupName: string, public readonly orgs: OrgSummary[]) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'orgGroup';
  }
}

export class OrgItem extends vscode.TreeItem {
  constructor(public readonly org: OrgSummary) {
    super(org.alias ?? org.username, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = `${org.username}${org.isDefault ? ' (default)' : ''}`;
    this.contextValue = org.status === ConnectionStatus.Connected ? 'org' : 'orgExpired';
    this.iconPath = new vscode.ThemeIcon(
      org.status === ConnectionStatus.Connected ? 'circle-filled' : 'warning',
      new vscode.ThemeColor(org.status === ConnectionStatus.Connected ? 'charts.green' : 'charts.red')
    );
  }
}

export function toOrgSummary(arg: OrgSummary | OrgItem): OrgSummary {
  return arg instanceof OrgItem ? arg.org : arg;
}

export class OrgDetailItem extends vscode.TreeItem {
  constructor(label: string, value: string) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'orgDetail';
  }
}

export class OrgActionItem extends vscode.TreeItem {
  constructor(label: string, icon: string, commandId: string, org: OrgSummary) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = 'orgAction';
    this.command = { command: commandId, title: label, arguments: [org] };
  }
}
