import { OrgSummary, OrgDetails, OrgType, ConnectionStatus } from '../models/org';

interface RawNonScratchOrg {
  username: string;
  alias?: string;
  connectedStatus: string;
  isDevHub?: boolean;
  isSandbox?: boolean;
  isDefaultUsername?: boolean;
}

interface RawScratchOrg {
  username: string;
  alias?: string;
  status: string;
  expirationDate?: string;
  isDefaultUsername?: boolean;
}

export interface SfOrgListResult {
  nonScratchOrgs?: RawNonScratchOrg[];
  scratchOrgs?: RawScratchOrg[];
}

export interface SfOrgDisplayResult {
  id: string;
  apiVersion: string;
  instanceUrl: string;
  username: string;
  expirationDate?: string;
}

function classifyStatus(raw: string): ConnectionStatus {
  if (raw === 'Connected' || raw === 'Active') {
    return ConnectionStatus.Connected;
  }
  if (raw === 'Expired' || raw === 'RefreshTokenAuthError') {
    return ConnectionStatus.Expired;
  }
  return ConnectionStatus.Error;
}

export function parseOrgList(raw: SfOrgListResult): OrgSummary[] {
  const summaries: OrgSummary[] = [];

  for (const org of raw.nonScratchOrgs ?? []) {
    summaries.push({
      username: org.username,
      alias: org.alias,
      orgType: org.isDevHub ? OrgType.DevHub : org.isSandbox ? OrgType.Sandbox : OrgType.Production,
      status: classifyStatus(org.connectedStatus),
      isDefault: !!org.isDefaultUsername,
    });
  }

  for (const org of raw.scratchOrgs ?? []) {
    summaries.push({
      username: org.username,
      alias: org.alias,
      orgType: OrgType.Scratch,
      status: classifyStatus(org.status),
      isDefault: !!org.isDefaultUsername,
      expirationDate: org.expirationDate,
    });
  }

  return summaries;
}

export function parseOrgDisplay(raw: SfOrgDisplayResult): OrgDetails {
  return {
    username: raw.username,
    orgId: raw.id,
    instanceUrl: raw.instanceUrl,
    apiVersion: raw.apiVersion,
    expirationDate: raw.expirationDate,
  };
}
