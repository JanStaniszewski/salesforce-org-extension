# Salesforce Org Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code extension that adds an Activity Bar view listing all `sf`-CLI-authorized Salesforce orgs, lets the user authorize new orgs, inspect/manage existing ones (set default, open in browser, logout, refresh token), and organize them into user-defined project/category tags with grouping and filtering.

**Architecture:** Thin service layer (`OrgService`, `CategoryService`) wraps the Salesforce CLI (`sf`) via a dependency-injectable `child_process.exec` shim (`cliRunner`), so all CLI-JSON-parsing logic is unit-testable without a real CLI or VS Code host. A `TreeDataProvider` (`OrgTreeProvider`) renders orgs grouped by type or by category, using pure/testable grouping functions. Commands are grouped by concern (authorize, org actions, category actions) and registered from `extension.ts`.

**Tech Stack:** TypeScript, VS Code Extension API (`vscode` ^1.85), esbuild (bundler), npm, Mocha (unit tests run directly under `ts-node`, plus an `@vscode/test-electron` integration smoke test).

---

## Spec reference

Implements `docs/superpowers/specs/2026-07-02-salesforce-org-manager-design.md` in full, including the categorization/tagging addendum.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.js`
- Create: `.gitignore`
- Create: `.mocharc.json`
- Create: `.vscode/launch.json`
- Create: `.vscode/tasks.json`
- Create: `resources/org-icon.svg`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sf-org-manager",
  "displayName": "Salesforce Org Manager",
  "description": "Zarządzanie zautoryzowanymi orgami Salesforce z poziomu VS Code",
  "version": "0.0.1",
  "publisher": "local-dev",
  "private": true,
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "sfOrgManager",
          "title": "Salesforce Orgs",
          "icon": "resources/org-icon.svg"
        }
      ]
    },
    "views": {
      "sfOrgManager": [
        {
          "id": "sfOrgManagerView",
          "name": "Orgs"
        }
      ]
    }
  },
  "scripts": {
    "compile": "npm run check-types && node esbuild.js",
    "check-types": "tsc --noEmit",
    "watch": "node esbuild.js --watch",
    "package": "npm run check-types && node esbuild.js --production",
    "test:unit": "mocha",
    "pretest:integration": "tsc -p ./test/tsconfig.json",
    "test:integration": "npm run pretest:integration && node ./out/test/runTest.js",
    "test": "npm run test:unit"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.6",
    "@types/node": "^20.11.0",
    "@types/vscode": "^1.85.0",
    "@vscode/test-electron": "^2.3.9",
    "esbuild": "^0.20.0",
    "glob": "^10.3.10",
    "mocha": "^10.3.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test", "dist", "out"]
}
```

- [ ] **Step 3: Create `esbuild.js`**

```javascript
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
out/
.vscode-test/
*.vsix
```

- [ ] **Step 5: Create `.mocharc.json`** (config for the fast, VS-Code-free unit test suite)

```json
{
  "require": "ts-node/register",
  "extension": ["ts"],
  "spec": "test/unit/**/*.test.ts",
  "timeout": 5000
}
```

- [ ] **Step 6: Create `.vscode/launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

- [ ] **Step 7: Create `.vscode/tasks.json`**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$esbuild-watch",
      "isBackground": true,
      "presentation": { "reveal": "never" },
      "group": { "kind": "build", "isDefault": true }
    }
  ]
}
```

- [ ] **Step 8: Create `resources/org-icon.svg`** (monochrome Activity Bar icon — must use `currentColor` so VS Code can recolor it per theme)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
  <path fill="currentColor" d="M8 2a4 4 0 0 0-3.87 3.02A3 3 0 0 0 3 11h9a3.5 3.5 0 0 0 .5-6.95A4 4 0 0 0 8 2z"/>
</svg>
```

- [ ] **Step 9: Install dependencies**

Run: `cd /Users/j.staniszewski/Documents/Projects/salesforce-org-extension && npm install`
Expected: `package-lock.json` and `node_modules/` created, no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json esbuild.js .gitignore .mocharc.json .vscode/launch.json .vscode/tasks.json resources/org-icon.svg
git commit -m "chore: scaffold VS Code extension project"
```

---

### Task 2: Org data model

**Files:**
- Create: `src/models/org.ts`

- [ ] **Step 1: Create the shared types**

```typescript
// src/models/org.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/models/org.ts
git commit -m "feat: add Org data model types"
```

---

### Task 3: CLI Runner (low-level `sf` process wrapper)

**Files:**
- Create: `src/cli/cliRunner.ts`
- Test: `test/unit/cliRunner.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/cliRunner.test.ts
import * as assert from 'assert';
import { runCliJson, runCli, CliError, ExecFn } from '../../src/cli/cliRunner';

function fakeExec(stdout: string, stderr = '', error: Error | null = null): ExecFn {
  return (_command, _options, callback) => {
    callback(error, stdout, stderr);
  };
}

suite('cliRunner', () => {
  test('runCliJson resolves with parsed result on success', async () => {
    const exec = fakeExec(JSON.stringify({ status: 0, result: { foo: 'bar' } }));
    const result = await runCliJson<{ foo: string }>('sf org list --json', exec);
    assert.strictEqual(result.foo, 'bar');
  });

  test('runCliJson rejects with CliError when status is non-zero', async () => {
    const exec = fakeExec(JSON.stringify({ status: 1, message: 'boom' }));
    await assert.rejects(
      () => runCliJson('sf org list --json', exec),
      (err: unknown) => err instanceof CliError && err.message === 'boom'
    );
  });

  test('runCliJson rejects with CliError when stdout is not valid JSON', async () => {
    const exec = fakeExec('not json', 'some stderr', new Error('exec failed'));
    await assert.rejects(
      () => runCliJson('sf org list --json', exec),
      (err: unknown) => err instanceof CliError
    );
  });

  test('runCli resolves with raw stdout', async () => {
    const exec = fakeExec('plain output');
    const result = await runCli('sf --version', exec);
    assert.strictEqual(result, 'plain output');
  });

  test('runCli rejects with CliError on exec error', async () => {
    const exec = fakeExec('', 'some stderr', new Error('exec failed'));
    await assert.rejects(
      () => runCli('sf --version', exec),
      (err: unknown) => err instanceof CliError
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/cli/cliRunner'`

- [ ] **Step 3: Implement `cliRunner.ts`**

```typescript
// src/cli/cliRunner.ts
import { exec as nodeExec, ExecException } from 'child_process';

export type ExecFn = (
  command: string,
  options: { maxBuffer: number },
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
) => void;

export class CliError extends Error {
  constructor(message: string, public readonly raw?: unknown) {
    super(message);
    this.name = 'CliError';
  }
}

const MAX_BUFFER = 10 * 1024 * 1024;

export function runCli(command: string, execFn: ExecFn = nodeExec as ExecFn): Promise<string> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      if (error) {
        reject(new CliError(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

interface SfJsonEnvelope<T> {
  status: number;
  result?: T;
  message?: string;
}

export function runCliJson<T>(command: string, execFn: ExecFn = nodeExec as ExecFn): Promise<T> {
  return new Promise((resolve, reject) => {
    execFn(command, { maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      let parsed: SfJsonEnvelope<T>;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        reject(new CliError(stderr || error?.message || 'Nie udało się sparsować odpowiedzi CLI'));
        return;
      }
      if (parsed.status !== 0) {
        reject(new CliError(parsed.message || 'Komenda CLI zakończyła się błędem', parsed));
        return;
      }
      resolve(parsed.result as T);
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 5 passing (`cliRunner`)

- [ ] **Step 5: Commit**

```bash
git add src/cli/cliRunner.ts test/unit/cliRunner.test.ts
git commit -m "feat: add dependency-injectable sf CLI runner with JSON envelope parsing"
```

---

### Task 4: `sf` CLI response parsing

**Files:**
- Create: `src/cli/sfCli.ts`
- Test: `test/unit/sfCli.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/sfCli.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/cli/sfCli'`

- [ ] **Step 3: Implement `sfCli.ts`**

```typescript
// src/cli/sfCli.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 3 more passing (`sfCli parsing`)

- [ ] **Step 5: Commit**

```bash
git add src/cli/sfCli.ts test/unit/sfCli.test.ts
git commit -m "feat: parse sf org list/display JSON into OrgSummary/OrgDetails"
```

> **Note for the implementer:** the exact JSON field names above (`nonScratchOrgs`, `scratchOrgs`, `connectedStatus`, `isDevHub`, `isSandbox`, `isDefaultUsername`, `status`, `expirationDate`) reflect the documented `sf org list --json` / `sf org display --json` shape at plan-writing time. Before relying on this in a real org, run `sf org list --json` and `sf org display --target-org <alias> --json` locally once (see Task 17) and diff the actual field names against `RawNonScratchOrg`/`RawScratchOrg`/`SfOrgDisplayResult` — adjust the interfaces and `parseOrgList`/`parseOrgDisplay` if your installed CLI version differs.

---

### Task 5: OrgService

**Files:**
- Create: `src/services/orgService.ts`
- Test: `test/unit/orgService.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/orgService.test.ts
import * as assert from 'assert';
import { OrgService } from '../../src/services/orgService';
import { ExecFn } from '../../src/cli/cliRunner';

suite('OrgService', () => {
  test('listOrgs parses and caches the org list', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            nonScratchOrgs: [
              {
                username: 'user@example.com',
                alias: 'myorg',
                connectedStatus: 'Connected',
                isDevHub: false,
                isSandbox: false,
                isDefaultUsername: true,
              },
            ],
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const first = await service.listOrgs();
    const second = await service.listOrgs();

    assert.strictEqual(first.length, 1);
    assert.strictEqual(first[0].alias, 'myorg');
    assert.strictEqual(second, first, 'second call should return the cached array');
    assert.strictEqual(callCount, 1, 'CLI should only be invoked once due to caching');
  });

  test('listOrgs bypasses cache when forceRefresh is true', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await service.listOrgs();
    await service.listOrgs(true);

    assert.strictEqual(callCount, 2);
  });

  test('getOrgDetails caches details per username', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: '00Dxx0000000000EAA',
            apiVersion: '61.0',
            instanceUrl: 'https://myorg.my.salesforce.com',
            username: 'user@example.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const details = await service.getOrgDetails('user@example.com');
    await service.getOrgDetails('user@example.com');

    assert.strictEqual(details.orgId, '00Dxx0000000000EAA');
    assert.strictEqual(callCount, 1);
  });

  test('loginWeb invalidates the org list cache', async () => {
    const commands: string[] = [];
    const execFn: ExecFn = (command, _options, callback) => {
      commands.push(command);
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await service.listOrgs();
    await service.loginWeb('newalias', 'https://login.salesforce.com');
    await service.listOrgs();

    const listCalls = commands.filter((c) => c.startsWith('sf org list')).length;
    assert.strictEqual(listCalls, 2, 'org list should be re-fetched after loginWeb');
  });

  test('logout invalidates both the org list and details cache', async () => {
    let detailCalls = 0;
    const execFn: ExecFn = (command, _options, callback) => {
      if (command.startsWith('sf org display')) {
        detailCalls++;
      }
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: 'x',
            apiVersion: '61.0',
            instanceUrl: 'x',
            username: 'user@example.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await service.getOrgDetails('user@example.com');
    await service.logout('user@example.com');
    await service.getOrgDetails('user@example.com');

    assert.strictEqual(detailCalls, 2, 'details should be re-fetched after logout clears the cache');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/services/orgService'`

- [ ] **Step 3: Implement `orgService.ts`**

```typescript
// src/services/orgService.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 5 more passing (`OrgService`)

- [ ] **Step 5: Commit**

```bash
git add src/services/orgService.ts test/unit/orgService.test.ts
git commit -m "feat: add OrgService with cached org list/details and CLI-backed actions"
```

- [ ] **Step 6 (security fix, added after code review): validate `alias`/`instanceUrl` before shell interpolation**

`cliRunner` shells out via `child_process.exec` (`/bin/sh -c`), and `loginWeb` builds its command via raw string interpolation. Task 12's authorize-new-org flow feeds free-text `alias`/`instanceUrl` input-box values straight into `loginWeb`, which is a command injection vector (e.g. an alias of `foo; rm -rf ~`). `username` values are safe (always sourced from `sf org list --json`'s own output), but `alias`/`instanceUrl` are the one place free-form human input reaches a shell string — so add allowlist validation at this single choke point, which protects both Task 12's authorize flow and Task 13's refresh-token flow (both call `loginWeb`).

Add above the `OrgService` class:

```typescript
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
```

And update `loginWeb` to validate before constructing the command:

```typescript
async loginWeb(alias: string | undefined, instanceUrl: string): Promise<void> {
  if (alias) {
    assertSafeAlias(alias);
  }
  assertSafeInstanceUrl(instanceUrl);
  const aliasFlag = alias ? ` --alias ${alias}` : '';
  await runCliJson(`sf org login web${aliasFlag} --instance-url ${instanceUrl} --json`, this.execFn);
  this.invalidateOrgList();
}
```

Add 3 tests to `test/unit/orgService.test.ts` (rejects a shell-metacharacter alias, rejects a shell-metacharacter instance URL, accepts a normal alias/instanceUrl pair) — full suite becomes 16 passing. Commit separately:

```bash
git add src/services/orgService.ts test/unit/orgService.test.ts
git commit -m "fix: validate alias/instanceUrl before shell interpolation in loginWeb"
```

> **Why not rework `cliRunner` to `execFile`/argv-array instead?** That would eliminate this class of risk more thoroughly, but it would ripple through the already-built Tasks 3/4/5/8 and their tests. Since the actual attack surface is narrowly two free-text fields, a targeted allowlist at this one choke point is the proportionate fix. If a future task introduces another free-text value that reaches a CLI command, apply the same allowlist pattern there rather than assuming this fix covers it.

---

### Task 6: CategoryService

**Files:**
- Create: `src/services/categoryService.ts`
- Test: `test/unit/categoryService.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/categoryService.test.ts
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CategoryService } from '../../src/services/categoryService';

suite('CategoryService', () => {
  let tempFile: string;

  setup(() => {
    tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sf-org-manager-')), 'categories.json');
  });

  teardown(() => {
    fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
  });

  test('getCategory returns undefined when no file exists yet', () => {
    const service = new CategoryService(tempFile);
    assert.strictEqual(service.getCategory('user@example.com'), undefined);
  });

  test('assignCategory persists to disk and is readable by a new instance', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('user@example.com', 'ProjektX');

    const reloaded = new CategoryService(tempFile);
    assert.strictEqual(reloaded.getCategory('user@example.com'), 'ProjektX');
  });

  test('removeCategory clears the assignment', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('user@example.com', 'ProjektX');
    service.removeCategory('user@example.com');

    assert.strictEqual(service.getCategory('user@example.com'), undefined);
  });

  test('listCategories returns unique sorted category names', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('a@example.com', 'ProjektB');
    service.assignCategory('b@example.com', 'ProjektA');
    service.assignCategory('c@example.com', 'ProjektB');

    assert.deepStrictEqual(service.listCategories(), ['ProjektA', 'ProjektB']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/services/categoryService'`

- [ ] **Step 3: Implement `categoryService.ts`**

```typescript
// src/services/categoryService.ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CategoryStore {
  [username: string]: string;
}

const DEFAULT_FILE_PATH = path.join(os.homedir(), '.sf-org-manager', 'categories.json');

export class CategoryService {
  private cache: CategoryStore | undefined;

  constructor(private readonly filePath: string = DEFAULT_FILE_PATH) {}

  private load(): CategoryStore {
    if (this.cache) {
      return this.cache;
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.cache = JSON.parse(raw) as CategoryStore;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private save(store: CategoryStore): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
    this.cache = store;
  }

  getCategory(username: string): string | undefined {
    return this.load()[username];
  }

  assignCategory(username: string, category: string): void {
    this.save({ ...this.load(), [username]: category });
  }

  removeCategory(username: string): void {
    const store = { ...this.load() };
    delete store[username];
    this.save(store);
  }

  listCategories(): string[] {
    return [...new Set(Object.values(this.load()))].sort();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 4 more passing (`CategoryService`)

- [ ] **Step 5: Commit**

```bash
git add src/services/categoryService.ts test/unit/categoryService.test.ts
git commit -m "feat: add CategoryService backed by a JSON file in the user's home directory"
```

---

### Task 7: Grouping/filtering logic

**Files:**
- Create: `src/tree/grouping.ts`
- Test: `test/unit/grouping.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/grouping.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/tree/grouping'`

- [ ] **Step 3: Implement `grouping.ts`**

```typescript
// src/tree/grouping.ts
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
  [OrgType.Production]: 'Production / Inne',
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

const UNCATEGORIZED_LABEL = 'Bez kategorii';

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 3 more passing (`grouping`)

- [ ] **Step 5: Commit**

```bash
git add src/tree/grouping.ts test/unit/grouping.test.ts
git commit -m "feat: add pure grouping/filtering functions for the org tree"
```

---

### Task 8: CLI install check

**Files:**
- Create: `src/util/cliInstallCheck.ts`
- Test: `test/unit/cliInstallCheck.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// test/unit/cliInstallCheck.test.ts
import * as assert from 'assert';
import { checkCliInstalled } from '../../src/util/cliInstallCheck';
import { ExecFn } from '../../src/cli/cliRunner';

suite('checkCliInstalled', () => {
  test('resolves true when sf --version succeeds', async () => {
    const execFn: ExecFn = (_command, _options, callback) => callback(null, '@salesforce/cli/2.0.0', '');
    assert.strictEqual(await checkCliInstalled(execFn), true);
  });

  test('resolves false when sf --version fails', async () => {
    const execFn: ExecFn = (_command, _options, callback) =>
      callback(new Error('not found'), '', 'command not found');
    assert.strictEqual(await checkCliInstalled(execFn), false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/util/cliInstallCheck'`

- [ ] **Step 3: Implement `cliInstallCheck.ts`**

```typescript
// src/util/cliInstallCheck.ts
import { runCli, ExecFn } from '../cli/cliRunner';

export async function checkCliInstalled(execFn?: ExecFn): Promise<boolean> {
  try {
    await runCli('sf --version', execFn);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 2 more passing (`checkCliInstalled`) — full unit suite now ~19 passing

- [ ] **Step 5: Commit**

```bash
git add src/util/cliInstallCheck.ts test/unit/cliInstallCheck.test.ts
git commit -m "feat: add sf CLI installation check"
```

---

### Task 9: Tree item classes

**Files:**
- Create: `src/tree/treeItems.ts`

No unit tests here — this module depends on the `vscode` API, which is only available inside the Extension Host, so it is covered by manual verification in Task 11 and the integration smoke test in Task 16.

- [ ] **Step 1: Implement `treeItems.ts`**

```typescript
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
    this.description = `${org.username}${org.isDefault ? ' (domyślna)' : ''}`;
    this.contextValue = 'org';
    this.iconPath = new vscode.ThemeIcon(
      org.status === ConnectionStatus.Connected ? 'circle-filled' : 'warning',
      new vscode.ThemeColor(org.status === ConnectionStatus.Connected ? 'charts.green' : 'charts.red')
    );
  }
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
```

- [ ] **Step 2: Type-check**

Run: `npm run check-types`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/tree/treeItems.ts
git commit -m "feat: add TreeItem subclasses for org groups, orgs, details and actions"
```

---

### Task 10: OrgTreeProvider

**Files:**
- Create: `src/tree/orgTreeProvider.ts`

No unit tests here (depends on `vscode.TreeDataProvider`); grouping/filtering logic it delegates to was already unit-tested in Task 7. Covered by manual verification in Task 11.

- [ ] **Step 1: Implement `orgTreeProvider.ts`**

```typescript
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
    if (!element) {
      return this.getRootGroups();
    }
    if (element instanceof OrgGroupItem) {
      return element.orgs.map((org) => new OrgItem(org));
    }
    if (element instanceof OrgItem) {
      return this.getOrgChildren(element.org);
    }
    return [];
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
```

- [ ] **Step 2: Type-check**

Run: `npm run check-types`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/tree/orgTreeProvider.ts
git commit -m "feat: add OrgTreeProvider with lazy detail loading and group/filter modes"
```

- [ ] **Step 4 (robustness fix, added after code review): surface CLI errors from `getChildren` instead of failing silently**

None of `getRootGroups`/`getOrgChildren` handle a rejection from `orgService.listOrgs()`/`getOrgDetails()`. If the CLI call fails (auth expired, `sf` not on PATH, network drop), the rejection propagates out of `getChildren()` uncaught, and VS Code's tree renderer just leaves the view silently blank with no indication why — unlike every write-side command (Task 13/14), which catches and calls `showErrorMessage`. Wrap `getChildren()`'s body in a try/catch:

```typescript
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
```

No other method changes. Run `npm run check-types` (clean, no new tests needed — this file has no unit tests, same reasoning as before) and commit separately:

```bash
git add src/tree/orgTreeProvider.ts
git commit -m "fix: surface CLI errors from getChildren instead of failing silently"
```

> Scope note: this is a single error notification + empty array, not a "welcome view"/empty-state UI, retry logic, or per-node error placeholders — those are legitimate future improvements but out of scope here.

---

### Task 11: Extension activation & view registration

**Files:**
- Create: `src/extension.ts`

- [ ] **Step 1: Implement `extension.ts`** (commands referenced here are registered in Tasks 12–14; activation must still compile and run correctly once those are added)

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { OrgService } from './services/orgService';
import { CategoryService } from './services/categoryService';
import { OrgTreeProvider } from './tree/orgTreeProvider';
import { checkCliInstalled } from './util/cliInstallCheck';
import { registerAuthorizeOrgCommand } from './commands/authorizeOrg';
import { registerOrgActionCommands } from './commands/orgActions';
import { registerCategoryCommands } from './commands/categoryCommands';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const cliInstalled = await checkCliInstalled();
  if (!cliInstalled) {
    void vscode.window
      .showErrorMessage(
        'Nie znaleziono Salesforce CLI ("sf"). Zainstaluj je, aby korzystać z Salesforce Org Manager.',
        'Otwórz instrukcję instalacji'
      )
      .then((choice) => {
        if (choice) {
          void vscode.env.openExternal(vscode.Uri.parse('https://developer.salesforce.com/tools/salesforcecli'));
        }
      });
    return;
  }

  const orgService = new OrgService();
  const categoryService = new CategoryService();
  const treeProvider = new OrgTreeProvider(orgService, categoryService);

  context.subscriptions.push(vscode.window.registerTreeDataProvider('sfOrgManagerView', treeProvider));

  registerAuthorizeOrgCommand(context, orgService, treeProvider);
  registerOrgActionCommands(context, orgService, treeProvider);
  registerCategoryCommands(context, categoryService, treeProvider);
}

export function deactivate(): void {}
```

This task depends on files from Tasks 12–14; write those next, then return here to compile.

- [ ] **Step 2: Commit** (after Tasks 12–14 are done and this compiles — see Task 14 Step 3 for the combined build/manual-test checkpoint)

```bash
git add src/extension.ts
git commit -m "feat: wire extension activation, tree view registration and CLI presence check"
```

---

### Task 12: Authorize-new-org command

**Files:**
- Create: `src/commands/authorizeOrg.ts`

- [ ] **Step 1: Implement `authorizeOrg.ts`**

```typescript
// src/commands/authorizeOrg.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';

const INSTANCE_URLS: Record<string, string> = {
  Production: 'https://login.salesforce.com',
  Sandbox: 'https://test.salesforce.com',
};

export function registerAuthorizeOrgCommand(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  const disposable = vscode.commands.registerCommand('sfOrgManager.authorizeOrg', async () => {
    const orgTypePick = await vscode.window.showQuickPick(['Production', 'Sandbox', 'Custom URL'], {
      placeHolder: 'Wybierz typ orgi do autoryzacji',
    });
    if (!orgTypePick) {
      return;
    }

    let instanceUrl: string;
    if (orgTypePick === 'Custom URL') {
      const customUrl = await vscode.window.showInputBox({
        prompt: 'Podaj instance URL (np. https://mydomain.my.salesforce.com)',
      });
      if (!customUrl) {
        return;
      }
      instanceUrl = customUrl;
    } else {
      instanceUrl = INSTANCE_URLS[orgTypePick];
    }

    const alias = await vscode.window.showInputBox({
      prompt: 'Alias dla orgi (opcjonalnie, zostaw puste żeby CLI wygenerowało)',
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Czekam na autoryzację w przeglądarce...',
        cancellable: false,
      },
      async () => {
        try {
          await orgService.loginWeb(alias || undefined, instanceUrl);
          treeProvider.refresh();
          void vscode.window.showInformationMessage(`Orga${alias ? ` "${alias}"` : ''} została zautoryzowana.`);
        } catch (error) {
          void vscode.window.showErrorMessage(`Autoryzacja nie powiodła się: ${(error as Error).message}`);
        }
      }
    );
  });
  context.subscriptions.push(disposable);
}
```

> Note: since Task 5's security fix, `orgService.loginWeb` validates `alias`/`instanceUrl` and throws on invalid input (e.g. shell metacharacters). The `catch` block above already forwards `(error as Error).message` to `showErrorMessage`, so a rejected alias/URL surfaces to the user as a normal error notification — no extra handling needed here.

- [ ] **Step 2: Type-check**

Run: `npm run check-types`
Expected: still fails at this point (`orgActions.ts` and `categoryCommands.ts` don't exist yet, and `extension.ts` imports them) — that's expected; continue to Task 13.

- [ ] **Step 3: Commit**

```bash
git add src/commands/authorizeOrg.ts
git commit -m "feat: add authorize-new-org command with type/URL quickpick and progress notification"
```

---

### Task 13: Org action commands

**Files:**
- Create: `src/commands/orgActions.ts`

- [ ] **Step 1: Implement `orgActions.ts`**

```typescript
// src/commands/orgActions.ts
import * as vscode from 'vscode';
import { OrgService } from '../services/orgService';
import { OrgTreeProvider } from '../tree/orgTreeProvider';
import { OrgSummary, OrgType } from '../models/org';

export function registerOrgActionCommands(
  context: vscode.ExtensionContext,
  orgService: OrgService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.setDefault', async (org: OrgSummary) => {
      try {
        await orgService.setDefault(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`"${org.alias ?? org.username}" ustawiona jako domyślna.`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Nie udało się ustawić domyślnej orgi: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.openInBrowser', async (org: OrgSummary) => {
      try {
        await orgService.openInBrowser(org.username);
      } catch (error) {
        void vscode.window.showErrorMessage(`Nie udało się otworzyć orgi: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.logout', async (org: OrgSummary) => {
      const confirmed = await vscode.window.showWarningMessage(
        `Na pewno wylogować "${org.alias ?? org.username}"?`,
        { modal: true },
        'Wyloguj'
      );
      if (confirmed !== 'Wyloguj') {
        return;
      }
      try {
        await orgService.logout(org.username);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Wylogowano z "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Wylogowanie nie powiodło się: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refreshToken', async (org: OrgSummary) => {
      const instanceUrl = org.orgType === OrgType.Sandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
      try {
        await orgService.loginWeb(org.alias, instanceUrl);
        treeProvider.refresh();
        void vscode.window.showInformationMessage(`Token odświeżony dla "${org.alias ?? org.username}".`);
      } catch (error) {
        void vscode.window.showErrorMessage(`Odświeżenie tokena nie powiodło się: ${(error as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.refresh', () => {
      orgService.invalidateOrgList();
      treeProvider.refresh();
    })
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/orgActions.ts
git commit -m "feat: add set-default, open-in-browser, logout, refresh-token and refresh commands"
```

---

### Task 14: Category commands

**Files:**
- Create: `src/commands/categoryCommands.ts`

- [ ] **Step 1: Implement `categoryCommands.ts`**

```typescript
// src/commands/categoryCommands.ts
import * as vscode from 'vscode';
import { CategoryService } from '../services/categoryService';
import { OrgTreeProvider, GroupMode } from '../tree/orgTreeProvider';
import { OrgSummary } from '../models/org';

const CREATE_NEW_LABEL = '$(add) Utwórz nową...';

export function registerCategoryCommands(
  context: vscode.ExtensionContext,
  categoryService: CategoryService,
  treeProvider: OrgTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.assignCategory', async (org: OrgSummary) => {
      const existing = categoryService.listCategories();
      const pick = await vscode.window.showQuickPick([CREATE_NEW_LABEL, ...existing], {
        placeHolder: `Przypisz "${org.alias ?? org.username}" do projektu/kategorii`,
      });
      if (!pick) {
        return;
      }
      let category = pick;
      if (pick === CREATE_NEW_LABEL) {
        const newCategory = await vscode.window.showInputBox({ prompt: 'Nazwa nowej kategorii/projektu' });
        if (!newCategory) {
          return;
        }
        category = newCategory;
      }
      categoryService.assignCategory(org.username, category);
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.removeCategory', (org: OrgSummary) => {
      categoryService.removeCategory(org.username);
      treeProvider.refresh();
    })
  );

  let groupMode: GroupMode = 'type';
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.toggleGroupMode', () => {
      groupMode = groupMode === 'type' ? 'category' : 'type';
      treeProvider.setGroupMode(groupMode);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.filterByCategory', async () => {
      const existing = categoryService.listCategories();
      if (existing.length === 0) {
        void vscode.window.showInformationMessage('Brak zdefiniowanych kategorii.');
        return;
      }
      const pick = await vscode.window.showQuickPick(existing, { placeHolder: 'Filtruj wg kategorii' });
      if (!pick) {
        return;
      }
      treeProvider.setCategoryFilter(pick);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.clearCategoryFilter', () => {
      treeProvider.setCategoryFilter(undefined);
    })
  );
}
```

- [ ] **Step 2: Full type-check now that all imports of `extension.ts` exist**

Run: `npm run check-types`
Expected: no errors

- [ ] **Step 3: Build and manually smoke-test in the Extension Host**

Run: `npm run compile`
Expected: `dist/extension.js` created, no errors.

Then press `F5` in VS Code (or `code --extensionDevelopmentPath=.` from a shell) to launch the Extension Development Host, and confirm:
- The "Salesforce Orgs" icon appears in the Activity Bar.
- Clicking it shows the "Orgs" view (empty or grouped by type if you already have `sf`-authorized orgs).
- The view title bar shows icons for Authorize, Refresh, Toggle Group Mode, Filter, Clear Filter.

- [ ] **Step 4: Commit**

```bash
git add src/commands/categoryCommands.ts
git commit -m "feat: add category assignment, removal, group-mode toggle and filter commands"
```

---

### Task 15: `package.json` contributes (commands, menus)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `commands` and `menus` under `contributes`**

Replace the existing `"contributes"` block in `package.json` with:

```json
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "sfOrgManager",
          "title": "Salesforce Orgs",
          "icon": "resources/org-icon.svg"
        }
      ]
    },
    "views": {
      "sfOrgManager": [
        {
          "id": "sfOrgManagerView",
          "name": "Orgs"
        }
      ]
    },
    "commands": [
      { "command": "sfOrgManager.authorizeOrg", "title": "Salesforce Org Manager: Authorize New Org", "icon": "$(add)" },
      { "command": "sfOrgManager.refresh", "title": "Salesforce Org Manager: Refresh", "icon": "$(refresh)" },
      { "command": "sfOrgManager.toggleGroupMode", "title": "Salesforce Org Manager: Toggle Group Mode", "icon": "$(list-tree)" },
      { "command": "sfOrgManager.filterByCategory", "title": "Salesforce Org Manager: Filter by Category", "icon": "$(filter)" },
      { "command": "sfOrgManager.clearCategoryFilter", "title": "Salesforce Org Manager: Clear Category Filter", "icon": "$(clear-all)" },
      { "command": "sfOrgManager.setDefault", "title": "Salesforce Org Manager: Set as Default Org" },
      { "command": "sfOrgManager.openInBrowser", "title": "Salesforce Org Manager: Open in Browser" },
      { "command": "sfOrgManager.logout", "title": "Salesforce Org Manager: Logout" },
      { "command": "sfOrgManager.refreshToken", "title": "Salesforce Org Manager: Refresh Token" },
      { "command": "sfOrgManager.assignCategory", "title": "Salesforce Org Manager: Assign to Project/Category" },
      { "command": "sfOrgManager.removeCategory", "title": "Salesforce Org Manager: Remove from Category" }
    ],
    "menus": {
      "view/title": [
        { "command": "sfOrgManager.authorizeOrg", "when": "view == sfOrgManagerView", "group": "navigation@1" },
        { "command": "sfOrgManager.refresh", "when": "view == sfOrgManagerView", "group": "navigation@2" },
        { "command": "sfOrgManager.toggleGroupMode", "when": "view == sfOrgManagerView", "group": "navigation@3" },
        { "command": "sfOrgManager.filterByCategory", "when": "view == sfOrgManagerView", "group": "navigation@4" },
        { "command": "sfOrgManager.clearCategoryFilter", "when": "view == sfOrgManagerView", "group": "navigation@5" }
      ],
      "view/item/context": [
        { "command": "sfOrgManager.setDefault", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.openInBrowser", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.assignCategory", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.removeCategory", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.logout", "when": "view == sfOrgManagerView && viewItem == org" }
      ]
    }
  },
```

- [ ] **Step 2: Rebuild and manually verify context menu / title bar wiring**

Run: `npm run compile`, then relaunch the Extension Development Host (`F5`).
Expected: right-clicking an org node shows "Set as Default Org", "Open in Browser", "Assign to Project/Category", "Remove from Category", "Logout"; the view title bar icons trigger their respective quickpicks/notifications.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: contribute commands and menus for org actions and categorization"
```

---

### Task 16: Integration smoke test

**Files:**
- Create: `test/suite/index.ts`
- Create: `test/suite/extension.test.ts`
- Create: `test/runTest.ts`
- Create: `test/tsconfig.json`

- [ ] **Step 1: Create `test/tsconfig.json`** (compiles `src` + `test` to plain JS under `out/`, since `@vscode/test-electron` loads compiled files, not `.ts`)

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../out"
  },
  "include": ["../src/**/*", "./**/*"]
}
```

- [ ] **Step 2: Create `test/suite/index.ts`**

```typescript
// test/suite/index.ts
import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true });
  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/*.test.js', { cwd: testsRoot });
  files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
```

- [ ] **Step 3: Create `test/suite/extension.test.ts`**

```typescript
// test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension activation', () => {
  test('registers all Salesforce Org Manager commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expected = [
      'sfOrgManager.authorizeOrg',
      'sfOrgManager.refresh',
      'sfOrgManager.toggleGroupMode',
      'sfOrgManager.filterByCategory',
      'sfOrgManager.clearCategoryFilter',
      'sfOrgManager.setDefault',
      'sfOrgManager.openInBrowser',
      'sfOrgManager.logout',
      'sfOrgManager.refreshToken',
      'sfOrgManager.assignCategory',
      'sfOrgManager.removeCategory',
    ];
    for (const command of expected) {
      assert.ok(commands.includes(command), `expected command ${command} to be registered`);
    }
  });
});
```

- [ ] **Step 4: Create `test/runTest.ts`**

```typescript
// test/runTest.ts
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, '../out/test/suite/index');
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run integration tests', err);
    process.exit(1);
  }
}

main();
```

> Note: this smoke test only verifies command registration — it does not require an authorized `sf` org, so it will still pass (and exercise the "CLI not installed" early-return path) even if `sf` isn't on the test machine's PATH, in which case it should be skipped/expected to fail at the `checkCliInstalled` gate. If `sf` is installed, activation proceeds normally and all commands register.

- [ ] **Step 5: Run the integration test**

Run: `npm run test:integration`
Expected: Extension Development Host launches headlessly, PASS — 1 passing (`Extension activation`)

- [ ] **Step 6: Commit**

```bash
git add test/suite/index.ts test/suite/extension.test.ts test/runTest.ts test/tsconfig.json
git commit -m "test: add @vscode/test-electron smoke test for command registration"
```

---

### Task 17: Manual end-to-end verification

No files change in this task — it is a manual checklist to run once real `sf`-authorized orgs are available, per the spec's "no OAuth E2E automation" decision.

- [ ] **Step 1:** With at least one org authorized via plain `sf org login web` beforehand, launch the Extension Development Host and confirm the org appears in the correct type group with the right status icon.
- [ ] **Step 2:** Click "+" in the view title, authorize a new sandbox/scratch org through the extension's QuickPick + browser flow, and confirm it appears automatically after the progress notification completes.
- [ ] **Step 3:** Expand an org node and confirm Org ID / Instance URL / API Version rows appear, plus "Ustaw jako domyślną" and "Otwórz w przeglądarce" actions (and "Odśwież token" if the org's token is expired).
- [ ] **Step 4:** Right-click an org, run "Assign to Project/Category", create a new category, then toggle group mode and confirm the org now appears under that category name.
- [ ] **Step 5:** Use "Filter by Category" to narrow the view to one category, then "Clear Category Filter" to restore the full list.
- [ ] **Step 6:** Right-click and "Logout" an org, confirm the modal warning, confirm the org disappears from the list after confirming.
- [ ] **Step 7:** Compare the actual JSON shape from `sf org list --json` and `sf org display --target-org <alias> --json` run in a terminal against the `RawNonScratchOrg`/`RawScratchOrg`/`SfOrgDisplayResult` interfaces in `src/cli/sfCli.ts` (per the Task 4 note); adjust and re-run `npm run test:unit` if your CLI version's field names differ.

---

### Task 18: Packaging & README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Salesforce Org Manager

VS Code extension for managing Salesforce CLI (`sf`)-authorized orgs from a dedicated Activity Bar view: list orgs grouped by type or by your own project/category tags, authorize new orgs, and manage existing ones (set default, open in browser, logout, refresh token).

## Requirements

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`) installed and on your PATH.

## Development

```bash
npm install
npm run watch   # keep esbuild running in the background
```

Press `F5` in VS Code to launch the Extension Development Host.

## Testing

```bash
npm run test:unit         # fast, no VS Code host required
npm run test:integration  # @vscode/test-electron smoke test
```

## Packaging

```bash
npx @vscode/vsce package
```

Produces a `.vsix` you can install locally via "Extensions: Install from VSIX...". Update the `publisher` field in `package.json` before publishing to the Marketplace.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, testing and packaging instructions"
```

---

## Self-review notes

- **Spec coverage:** every spec section (tech stack, tree grouping/details/actions, authorization flow, actions/error handling, categorization model/storage/assignment/display/filter, testing) maps to a task above.
- **Type consistency verified:** `OrgSummary`/`OrgDetails` fields, `ExecFn`/`CliError`/`runCli`/`runCliJson` signatures, `CategoryService` method names, `groupOrgsByType`/`groupOrgsByCategory`/`filterByCategory` signatures, and all `sfOrgManager.*` command IDs are used identically across every task/file that references them.
- **Known assumption flagged:** the exact `sf org list`/`sf org display` JSON field names are asserted from documentation, not verified against a live CLI in this environment — Task 4's note and Task 17 Step 7 call this out explicitly with a concrete verification step.
