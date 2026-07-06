# Copy Auth URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a context-menu-only action that fetches an org's SFDX Auth URL (`sf org display --verbose --json`'s `sfdxAuthUrl` field) and copies it to the clipboard, without ever caching the value.

**Architecture:** A new, uncached `OrgService.getAuthUrl(username)` method fetches the value fresh on every call. A new command `sfOrgManager.copyAuthUrl` in `orgActions.ts` calls it and writes the result to the clipboard via `vscode.env.clipboard.writeText`. The command is wired only into the `view/item/context` menu — no tree-child action row, unlike the other org actions — since this operates on a credential-equivalent secret.

**Tech Stack:** Same as the rest of the extension — TypeScript, `vscode.env.clipboard`, the existing `ExecFn`-injected `OrgService` test pattern.

---

## Spec reference

Implements `docs/superpowers/specs/2026-07-06-copy-auth-url-design.md` in full.

---

### Task 1: `OrgService.getAuthUrl`

**Files:**
- Modify: `src/cli/sfCli.ts`
- Modify: `src/services/orgService.ts`
- Test: `test/unit/orgService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these three tests to the existing `suite('OrgService', ...)` block in `test/unit/orgService.test.ts` (append after the last test, `'logout invalidates both the org list and details cache'`, right before the suite's closing `});`):

```typescript
  test('getAuthUrl returns the sfdxAuthUrl from a verbose org display call', async () => {
    const commands: string[] = [];
    const execFn: ExecFn = (command, _options, callback) => {
      commands.push(command);
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: 'x',
            apiVersion: '61.0',
            instanceUrl: 'https://myorg.my.salesforce.com',
            username: 'user@example.com',
            sfdxAuthUrl: 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const authUrl = await service.getAuthUrl('user@example.com');

    assert.strictEqual(authUrl, 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com');
    assert.ok(commands[0].includes('--verbose'), 'command should request verbose output');
  });

  test('getAuthUrl throws when the CLI response has no sfdxAuthUrl', async () => {
    const execFn: ExecFn = (_command, _options, callback) => {
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: 'x',
            apiVersion: '61.0',
            instanceUrl: 'https://myorg.my.salesforce.com',
            username: 'user@example.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await assert.rejects(() => service.getAuthUrl('user@example.com'));
  });

  test('getAuthUrl never caches - two calls invoke the CLI twice', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: 'x',
            apiVersion: '61.0',
            instanceUrl: 'https://myorg.my.salesforce.com',
            username: 'user@example.com',
            sfdxAuthUrl: 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await service.getAuthUrl('user@example.com');
    await service.getAuthUrl('user@example.com');

    assert.strictEqual(callCount, 2, 'getAuthUrl should never cache — it should call the CLI every time');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `TypeError: service.getAuthUrl is not a function` (3 new failures)

- [ ] **Step 3: Add the verbose result type to `sfCli.ts`**

In `src/cli/sfCli.ts`, add this new exported interface right after the existing `SfOrgDisplayResult` interface (after line 31, before `function classifyStatus`):

```typescript
export interface SfOrgDisplayVerboseResult extends SfOrgDisplayResult {
  sfdxAuthUrl?: string;
}
```

The full interface block should now read:

```typescript
export interface SfOrgDisplayResult {
  id: string;
  apiVersion: string;
  instanceUrl: string;
  username: string;
  expirationDate?: string;
}

export interface SfOrgDisplayVerboseResult extends SfOrgDisplayResult {
  sfdxAuthUrl?: string;
}
```

- [ ] **Step 4: Implement `getAuthUrl` in `orgService.ts`**

In `src/services/orgService.ts`, update the import line to also bring in the new type:

```typescript
import { parseOrgList, parseOrgDisplay, SfOrgListResult, SfOrgDisplayResult, SfOrgDisplayVerboseResult } from '../cli/sfCli';
```

Then add this method to the `OrgService` class, right after `getOrgDetails` and before `loginWeb`:

```typescript
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
```

Note: deliberately no caching (no `Map`, no stored field) — every call re-invokes the CLI, per the design's security rationale (the secret shouldn't sit in memory longer than one copy operation needs it).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 3 more passing (full suite: 25 previous + 3 new = 28 passing)

- [ ] **Step 6: Type-check**

Run: `npm run check-types`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/cli/sfCli.ts src/services/orgService.ts test/unit/orgService.test.ts
git commit -m "feat: add uncached OrgService.getAuthUrl for the SFDX auth URL"
```

---

### Task 2: `copyAuthUrl` command

**Files:**
- Modify: `src/commands/orgActions.ts`

- [ ] **Step 1: Add the command registration**

In `src/commands/orgActions.ts`, add this new command registration inside `registerOrgActionCommands`, right after the `sfOrgManager.refreshToken` registration block and before the `sfOrgManager.refresh` one:

```typescript
  context.subscriptions.push(
    vscode.commands.registerCommand('sfOrgManager.copyAuthUrl', async (arg: OrgSummary | OrgItem) => {
      const org = toOrgSummary(arg);
      try {
        const authUrl = await orgService.getAuthUrl(org.username);
        await vscode.env.clipboard.writeText(authUrl);
        void vscode.window.showInformationMessage(
          `Auth URL dla "${org.alias ?? org.username}" skopiowany do schowka. Traktuj go jak hasło.`
        );
      } catch (error) {
        void vscode.window.showErrorMessage(`Nie udało się skopiować Auth URL: ${(error as Error).message}`);
      }
    })
  );
```

No new imports are needed — `OrgSummary`, `OrgItem`, and `toOrgSummary` are already imported at the top of this file from Task 13/14 of the original plan.

- [ ] **Step 2: Type-check**

Run: `npm run check-types`
Expected: no errors (this will still show the extension as functionally complete since no `package.json` wiring is needed for `check-types` to pass — the command string is just a runtime identifier here)

- [ ] **Step 3: Run the full unit suite to confirm nothing broke**

Run: `npm run test:unit`
Expected: PASS — still 28 passing (this file has no dedicated unit tests, same as the other command-registration files — covered by the integration smoke test in Task 3 below and manual verification)

- [ ] **Step 4: Commit**

```bash
git add src/commands/orgActions.ts
git commit -m "feat: add copyAuthUrl command that clipboards the SFDX auth URL"
```

---

### Task 3: Wire into `package.json` and the integration smoke test

**Files:**
- Modify: `package.json`
- Modify: `test/suite/extension.test.ts`

- [ ] **Step 1: Add the command declaration**

In `package.json`, inside `contributes.commands`, add this entry right after the `sfOrgManager.refreshToken` entry and before `sfOrgManager.assignCategory`:

```json
      { "command": "sfOrgManager.copyAuthUrl", "title": "Salesforce Org Manager: Copy Auth URL" },
```

The `commands` array should now read (in full, for reference — only the one line above is new):

```json
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
      { "command": "sfOrgManager.copyAuthUrl", "title": "Salesforce Org Manager: Copy Auth URL" },
      { "command": "sfOrgManager.assignCategory", "title": "Salesforce Org Manager: Assign to Project/Category" },
      { "command": "sfOrgManager.removeCategory", "title": "Salesforce Org Manager: Remove from Category" }
    ],
```

- [ ] **Step 2: Add the context-menu entry**

In `package.json`, inside `contributes.menus["view/item/context"]`, add this entry after `sfOrgManager.logout` (as the last entry in the array):

```json
        { "command": "sfOrgManager.copyAuthUrl", "when": "view == sfOrgManagerView && viewItem == org" }
```

The full `view/item/context` array should now read:

```json
      "view/item/context": [
        { "command": "sfOrgManager.setDefault", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.openInBrowser", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.assignCategory", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.removeCategory", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.logout", "when": "view == sfOrgManagerView && viewItem == org" },
        { "command": "sfOrgManager.copyAuthUrl", "when": "view == sfOrgManagerView && viewItem == org" }
      ]
```

Deliberately **not** added to `view/title` (it's not a global action) and **not** added anywhere in `src/tree/orgTreeProvider.ts`'s `getOrgChildren` (no `OrgActionItem` tree-child row) — per the design, this stays context-menu-only.

- [ ] **Step 3: Update the integration smoke test's expected command list**

In `test/suite/extension.test.ts`, add `'sfOrgManager.copyAuthUrl'` to the `expected` array, after `'sfOrgManager.refreshToken'`:

```typescript
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
      'sfOrgManager.copyAuthUrl',
      'sfOrgManager.assignCategory',
      'sfOrgManager.removeCategory',
    ];
```

- [ ] **Step 4: Rebuild and type-check**

Run: `npm run compile`
Expected: no errors, `dist/extension.js` rebuilt

- [ ] **Step 5: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS — still 28 passing (no unit tests changed in this task)

- [ ] **Step 6: Commit**

```bash
git add package.json test/suite/extension.test.ts
git commit -m "feat: wire copyAuthUrl into the context menu and integration test"
```

---

### Task 4: Manual verification

No files change in this task.

- [ ] **Step 1:** Press `F5`, right-click an org in the tree. Confirm "Copy Auth URL" appears in the context menu, and confirm it does **not** appear as a row when the org node is expanded (unlike "Ustaw jako domyślną"/"Otwórz w przeglądarce").
- [ ] **Step 2:** Click "Copy Auth URL". Confirm a notification appears saying the URL was copied and to treat it like a password. Paste the clipboard contents somewhere temporary (e.g. a scratch file) and confirm it looks like `force://PlatformCLI::<token>@<host>` — then delete that scratch file/clear the clipboard once confirmed, since it's a real credential.
- [ ] **Step 3:** Run `npm run test:integration` on your machine (not a headless sandbox) and confirm it still passes with the extra command now included.

---

## Self-review notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-06-copy-auth-url-design.md` (uncached fetch, command + clipboard + info message, context-menu-only placement, no confirmation modal, no auto-clear, test coverage) maps to a task above.
- **Type consistency verified:** `SfOrgDisplayVerboseResult extends SfOrgDisplayResult` (Task 1) is used identically in `OrgService.getAuthUrl`'s `runCliJson<SfOrgDisplayVerboseResult>` call; the `sfOrgManager.copyAuthUrl` command ID string is identical across `orgActions.ts`, `package.json` (both `commands` and `view/item/context`), and `extension.test.ts`'s expected list.
- **No placeholders:** every step has complete, exact code — no "add appropriate handling" language.
