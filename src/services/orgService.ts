import { runCli, runCliJson, ExecFn } from '../cli/cliRunner';
import { parseOrgList, parseOrgDisplay, SfOrgListResult, SfOrgDisplayResult } from '../cli/sfCli';
import { OrgSummary, OrgDetails } from '../models/org';

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

  async loginWeb(alias: string | undefined, instanceUrl: string): Promise<void> {
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
