# Change Log

All notable changes to the "Salesforce Org Manager" extension are documented in this file.

## [0.0.3] - 2026-07-07

### Fixed

- Authorizing an org with an alias containing spaces (e.g. "RMPP CI1") no longer fails with "Invalid alias". The alias is now passed directly to the CLI process instead of through a shell command string, so spaces and punctuation no longer need to be rejected to prevent command injection.

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
