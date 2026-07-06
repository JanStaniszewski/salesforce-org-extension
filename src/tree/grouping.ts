import { OrgSummary, OrgType } from '../models/org';

export interface OrgGroup {
  groupName: string;
  orgs: OrgSummary[];
}

const TYPE_GROUP_ORDER = [OrgType.DevHub, OrgType.Sandbox, OrgType.Scratch, OrgType.Production];

const TYPE_GROUP_LABELS: Record<OrgType, string> = {
  [OrgType.DevHub]: 'Dev Hubs',
  [OrgType.Sandbox]: 'Sandboxes',
  [OrgType.Scratch]: 'Scratch Orgs',
  [OrgType.Production]: 'Production / Other',
};

export function groupOrgsByType(orgs: OrgSummary[]): OrgGroup[] {
  const groups: OrgGroup[] = [];
  for (const type of TYPE_GROUP_ORDER) {
    const matching = orgs.filter((org) => org.orgType === type);
    if (matching.length > 0) {
      groups.push({ groupName: TYPE_GROUP_LABELS[type], orgs: matching });
    }
  }
  return groups;
}

const UNCATEGORIZED_LABEL = 'Uncategorized';

export function groupOrgsByCategory(
  orgs: OrgSummary[],
  categoryOf: (username: string) => string | undefined
): OrgGroup[] {
  const map = new Map<string, OrgSummary[]>();
  for (const org of orgs) {
    const category = categoryOf(org.username) ?? UNCATEGORIZED_LABEL;
    const list = map.get(category) ?? [];
    list.push(org);
    map.set(category, list);
  }

  const sortedNames = [...map.keys()].filter((name) => name !== UNCATEGORIZED_LABEL).sort();
  const groups = sortedNames.map((groupName) => ({ groupName, orgs: map.get(groupName)! }));
  if (map.has(UNCATEGORIZED_LABEL)) {
    groups.push({ groupName: UNCATEGORIZED_LABEL, orgs: map.get(UNCATEGORIZED_LABEL)! });
  }
  return groups;
}

export function filterByCategory(
  orgs: OrgSummary[],
  category: string,
  categoryOf: (username: string) => string | undefined
): OrgSummary[] {
  return orgs.filter((org) => categoryOf(org.username) === category);
}
