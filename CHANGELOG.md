# Change Log

All notable changes to the "Salesforce Org Manager" extension are documented in this file.

## [0.0.3] - 2026-07-07

### Added

- The "Waiting for browser authorization..." notification can now be cancelled, which aborts the underlying `sf org login web` process instead of leaving it running in the background.
- Every org action (Set as Default, Open in Browser, Logout, Refresh Token, Copy Auth URL) now shows a progress notification with a **Cancel** button that stops the underlying CLI process, instead of running with no feedback and no way to back out.
- Success notifications are now prefixed with ✅ and failure notifications with ❌, so successes and failures are distinguishable at a glance.

### Fixed

- Authorizing an org with an alias containing spaces (e.g. "RMPP CI1") no longer fails with "Invalid alias". The alias is now passed directly to the CLI process instead of through a shell command string, so spaces and punctuation no longer need to be rejected to prevent command injection.
- Orgs whose connection is broken now reliably show the **Refresh Token** action. The CLI reports broken connections with descriptive messages (e.g. "Unable to refresh session due to: ... expired access/refresh token") rather than a fixed set of status codes, so any non-connected org is now treated as needing re-authentication instead of only literal "Expired"/"RefreshTokenAuthError" values.
- **Set as Default** and **Open in Browser** no longer appear (inline or in the right-click menu) for orgs that need re-authentication, since both actions require a live connection and would just fail. Only **Refresh Token** shows for those orgs.
- Cancelling "Authorize New Org" / "Refresh Token" no longer leaves an orphaned `sf` process holding the local OAuth callback port open, which previously made every subsequent authorization attempt fail with "Cannot start the OAuth redirect server on port 1717." `sf` launches its real CLI process as a child of a wrapper script, so killing only the wrapper (the previous behavior) left that child running; CLI processes are now spawned in their own process group so cancelling kills the whole group.
- **Set as Default** now actually changes the effective default org when the open workspace is a Salesforce DX project. `sf config set target-org` prefers a project's local config over the `--global` one, so writing only `--global` (the previous behavior) silently had no effect whenever the project already had its own local default — the org list kept showing the old org as default. CLI calls are now also run with the workspace folder as their working directory instead of an unspecified one, so the local config actually belongs to the open project.

## [0.0.2] - 2026-07-07

### Added

- Extension icon, Marketplace keywords, and a screenshot-illustrated README for the Marketplace listing.

### Changed

- Right-click context menu now shows short action labels (e.g. "Copy Auth URL") instead of repeating "Salesforce Org Manager: " on every item; the full name still appears in the Command Palette.

## [0.0.1] - 2026-07-06

Initial release.

### Added

- **Org Explorer** view in the Activity Bar, listing every org authorized via the `sf` CLI, grouped automatically by type (Dev Hubs, Sandboxes, Scratch Orgs, Production/Other) with a connection status indicator per org.
- **Authorize New Org** command — guides you through `sf org login web` for Production, Sandbox, or a custom instance URL, with an optional alias and a progress notification.
- **Org details on demand** — expand an org to see its Org ID, Instance URL, API version, and expiration date (for scratch orgs), fetched lazily.
- **Category/project tagging** — assign orgs to a custom category, switch the tree between grouping by type and grouping by category, and filter the tree down to a single category.
- **Right-click org actions**: Set as Default Org, Open in Browser, Assign to Project/Category, Remove from Category, Logout, and Copy Auth URL.
- **Refresh Token** inline action for orgs with an expired connection.
- Automatic check for the Salesforce CLI on activation, with a link to installation instructions if it's missing.
