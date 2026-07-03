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
