import * as assert from 'assert';
import { groupOrgsByType, groupOrgsByCategory, filterByCategory } from '../../src/tree/grouping';
import { OrgSummary, OrgType, ConnectionStatus } from '../../src/models/org';

function org(overrides: Partial<OrgSummary>): OrgSummary {
  return {
    username: 'user@example.com',
    orgType: OrgType.Production,
    status: ConnectionStatus.Connected,
    isDefault: false,
    ...overrides,
  };
}

suite('grouping', () => {
  test('groupOrgsByType groups in Dev Hub / Sandbox / Scratch / Production order, skipping empty groups', () => {
    const orgs = [
      org({ username: 'sandbox@x.com', orgType: OrgType.Sandbox }),
      org({ username: 'hub@x.com', orgType: OrgType.DevHub }),
      org({ username: 'prod@x.com', orgType: OrgType.Production }),
    ];

    const groups = groupOrgsByType(orgs);

    assert.deepStrictEqual(
      groups.map((g) => g.groupName),
      ['Dev Hubs', 'Sandboxes', 'Production / Inne']
    );
  });

  test('groupOrgsByCategory groups alphabetically with uncategorized last', () => {
    const orgs = [org({ username: 'a@x.com' }), org({ username: 'b@x.com' }), org({ username: 'c@x.com' })];
    const categories: Record<string, string> = { 'a@x.com': 'ProjektB', 'b@x.com': 'ProjektA' };

    const groups = groupOrgsByCategory(orgs, (u) => categories[u]);

    assert.deepStrictEqual(
      groups.map((g) => g.groupName),
      ['ProjektA', 'ProjektB', 'Bez kategorii']
    );
    assert.strictEqual(groups[2].orgs[0].username, 'c@x.com');
  });

  test('filterByCategory keeps only orgs assigned to the given category', () => {
    const orgs = [org({ username: 'a@x.com' }), org({ username: 'b@x.com' })];
    const categories: Record<string, string> = { 'a@x.com': 'ProjektA' };

    const filtered = filterByCategory(orgs, 'ProjektA', (u) => categories[u]);

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].username, 'a@x.com');
  });
});
