export enum OrgType {
  DevHub = 'DevHub',
  Sandbox = 'Sandbox',
  Scratch = 'Scratch',
  Production = 'Production',
}

export enum ConnectionStatus {
  Connected = 'Connected',
  Expired = 'Expired',
  Error = 'Error',
}

export interface OrgSummary {
  username: string;
  alias?: string;
  orgType: OrgType;
  status: ConnectionStatus;
  isDefault: boolean;
  expirationDate?: string;
}

export interface OrgDetails {
  username: string;
  orgId: string;
  instanceUrl: string;
  apiVersion: string;
  expirationDate?: string;
}
