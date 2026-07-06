import { runCli, runCliJson, ExecFn } from '../cli/cliRunner';
import { parseOrgList, parseOrgDisplay, SfOrgListResult, SfOrgDisplayResult, SfOrgDisplayVerboseResult } from '../cli/sfCli';
import { OrgSummary, OrgDetails } from '../models/org';

const SAFE_ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_INSTANCE_URL_PATTERN = /^https:\/\/[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::\d+)?\/?$/;

function assertSafeAlias(alias: string): void {
  if (!SAFE_ALIAS_PATTERN.test(alias)) {
    throw new Error('Nieprawidłowy alias — dozwolone są tylko litery, cyfry, myślnik i podkreślenik.');
  }
}

function assertSafeInstanceUrl(instanceUrl: string): void {
  if (!SAFE_INSTANCE_URL_PATTERN.test(instanceUrl)) {
    throw new Error('Nieprawidłowy instance URL — dozwolony jest tylko host https (np. https://mydomain.my.salesforce.com).');
  }
}

export class OrgService {
  private orgListCache: OrgSummary[] | undefined;
  private readonly detailsCache = new Map<string, OrgDetails>();

  constructor(private readonly execFn?: ExecFn) {}

  async listOrgs(forceRefresh = false): Promise<OrgSummary[]> {
    if (!forceRefresh && this.orgListCache) {
      return this.orgListCache;
    }
    const raw = await runCliJson<SfOrgListResult>('sf org list --json', this.execFn);
    this.orgListCache = parseOrgList(raw);
    return this.orgListCache;
  }

  async getOrgDetails(username: string, forceRefresh = false): Promise<OrgDetails> {
    if (!forceRefresh && this.detailsCache.has(username)) {
      return this.detailsCache.get(username)!;
    }
    const raw = await runCliJson<SfOrgDisplayResult>(
      `sf org display --target-org ${username} --json`,
      this.execFn
    );
    const details = parseOrgDisplay(raw);
    this.detailsCache.set(username, details);
    return details;
  }

  async getAuthUrl(username: string): Promise<string> {
    const raw = await runCliJson<SfOrgDisplayVerboseResult>(
      `sf org display --target-org ${username} --verbose --json`,
      this.execFn
    );
    if (!raw.sfdxAuthUrl) {
      throw new Error('CLI nie zwróciło Auth URL dla tej orgi.');
    }
    return raw.sfdxAuthUrl;
  }

  async loginWeb(alias: string | undefined, instanceUrl: string): Promise<void> {
    if (alias) {
      assertSafeAlias(alias);
    }
    assertSafeInstanceUrl(instanceUrl);
    const aliasFlag = alias ? ` --alias ${alias}` : '';
    await runCliJson(`sf org login web${aliasFlag} --instance-url ${instanceUrl} --json`, this.execFn);
    this.invalidateOrgList();
  }

  async logout(username: string): Promise<void> {
    await runCli(`sf org logout --target-org ${username} --no-prompt`, this.execFn);
    this.invalidateOrgList();
    this.detailsCache.delete(username);
  }

  async setDefault(username: string): Promise<void> {
    await runCli(`sf config set target-org=${username} --global`, this.execFn);
    this.invalidateOrgList();
  }

  async openInBrowser(username: string): Promise<void> {
    await runCli(`sf org open --target-org ${username}`, this.execFn);
  }

  invalidateOrgList(): void {
    this.orgListCache = undefined;
  }
}
