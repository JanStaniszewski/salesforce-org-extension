import { runCli, runCliJson, runCliFileJson, ExecFn, ExecFileFn } from '../cli/cliRunner';
import { parseOrgList, parseOrgDisplay, SfOrgListResult, SfOrgDisplayResult, SfShowSfdxAuthUrlResult } from '../cli/sfCli';
import { OrgSummary, OrgDetails } from '../models/org';

const SAFE_INSTANCE_URL_PATTERN = /^https:\/\/[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::\d+)?\/?$/;
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;

function assertSafeAlias(alias: string): void {
  if (alias.trim() !== alias || alias.length === 0) {
    throw new Error('Invalid alias — it cannot be empty or have leading/trailing whitespace.');
  }
  if (alias.length > 255) {
    throw new Error('Invalid alias — must be 255 characters or fewer.');
  }
  if (alias.startsWith('-')) {
    throw new Error('Invalid alias — it cannot start with a hyphen.');
  }
  if (CONTROL_CHAR_PATTERN.test(alias)) {
    throw new Error('Invalid alias — control characters are not allowed.');
  }
}

function assertSafeInstanceUrl(instanceUrl: string): void {
  if (!SAFE_INSTANCE_URL_PATTERN.test(instanceUrl)) {
    throw new Error('Invalid instance URL — only an https host is allowed (e.g. https://mydomain.my.salesforce.com).');
  }
}

export class OrgService {
  private orgListCache: OrgSummary[] | undefined;
  private readonly detailsCache = new Map<string, OrgDetails>();

  constructor(
    private readonly execFn?: ExecFn,
    private readonly execFileFn?: ExecFileFn
  ) {}

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
    const raw = await runCliJson<SfShowSfdxAuthUrlResult>(
      `sf org auth show-sfdx-auth-url --target-org ${username} --json`,
      this.execFn
    );
    if (!raw.sfdxAuthUrl || !raw.sfdxAuthUrl.startsWith('force://')) {
      throw new Error('The CLI did not return an Auth URL for this org.');
    }
    return raw.sfdxAuthUrl;
  }

  async loginWeb(alias: string | undefined, instanceUrl: string): Promise<void> {
    if (alias) {
      assertSafeAlias(alias);
    }
    assertSafeInstanceUrl(instanceUrl);
    const args = ['org', 'login', 'web', '--instance-url', instanceUrl, '--json'];
    if (alias) {
      args.push('--alias', alias);
    }
    // Passed via execFile (no shell), so arguments reach the CLI as literal
    // strings — spaces and punctuation in the alias don't need escaping.
    await runCliFileJson('sf', args, this.execFileFn);
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
