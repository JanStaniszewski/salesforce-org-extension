import * as assert from 'assert';
import { parseOrgList, parseOrgDisplay } from '../../src/cli/sfCli';
import { OrgType, ConnectionStatus } from '../../src/models/org';

suite('sfCli parsing', () => {
  test('parseOrgList classifies dev hub, sandbox, scratch and production orgs', () => {
    const raw = {
      nonScratchOrgs: [
        {
          username: 'devhub@example.com',
          alias: 'myhub',
          connectedStatus: 'Connected',
          isDevHub: true,
          isSandbox: false,
          isDefaultUsername: false,
        },
        {
          username: 'sandbox@example.com.sandbox1',
          alias: 'mysandbox',
          connectedStatus: 'Connected',
          isDevHub: false,
          isSandbox: true,
          isDefaultUsername: true,
        },
        {
          username: 'prod@example.com',
          connectedStatus: 'RefreshTokenAuthError',
          isDevHub: false,
          isSandbox: false,
          isDefaultUsername: false,
        },
      ],
      scratchOrgs: [
        {
          username: 'test-abc@example.com',
          alias: 'myscratch',
          status: 'Active',
          expirationDate: '2026-08-01',
          isDefaultUsername: false,
        },
      ],
    };

    const orgs = parseOrgList(raw);

    assert.strictEqual(orgs.length, 4);
    assert.deepStrictEqual(
      orgs.map((o) => o.orgType),
      [OrgType.DevHub, OrgType.Sandbox, OrgType.Production, OrgType.Scratch]
    );
    assert.strictEqual(orgs[1].isDefault, true);
    assert.strictEqual(orgs[2].status, ConnectionStatus.Expired);
    assert.strictEqual(orgs[3].expirationDate, '2026-08-01');
  });

  test('parseOrgList handles missing arrays gracefully', () => {
    assert.deepStrictEqual(parseOrgList({}), []);
  });

  test('parseOrgList classifies a descriptive refresh-token error message as Expired', () => {
    const raw = {
      nonScratchOrgs: [
        {
          username: 'broken@example.com',
          connectedStatus:
            'Unable to refresh session due to: Error authenticating with the refresh token due to: expired access/refresh token',
          isDevHub: false,
          isSandbox: false,
          isDefaultUsername: false,
        },
      ],
    };

    const orgs = parseOrgList(raw);

    assert.strictEqual(orgs[0].status, ConnectionStatus.Expired);
  });

  test('parseOrgDisplay maps raw fields to OrgDetails', () => {
    const details = parseOrgDisplay({
      id: '00Dxx0000000000EAA',
      apiVersion: '61.0',
      instanceUrl: 'https://myorg.my.salesforce.com',
      username: 'user@example.com',
      expirationDate: '2026-08-01',
    });

    assert.deepStrictEqual(details, {
      username: 'user@example.com',
      orgId: '00Dxx0000000000EAA',
      instanceUrl: 'https://myorg.my.salesforce.com',
      apiVersion: '61.0',
      expirationDate: '2026-08-01',
    });
  });
});
