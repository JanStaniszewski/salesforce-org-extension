// test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension activation', () => {
  test('registers all Salesforce Org Manager commands', async () => {
    // activationEvents is [] (implicit activation inferred from `contributes`),
    // so nothing activates the extension eagerly at Extension Host startup -
    // it only activates lazily when its view/commands are actually used.
    // Force activation explicitly before asserting on registered commands.
    const extension = vscode.extensions.getExtension('local-dev.sf-org-manager');
    assert.ok(extension, 'expected the local-dev.sf-org-manager extension to be found');
    await extension.activate();

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
      'sfOrgManager.copyAuthUrl',
      'sfOrgManager.assignCategory',
      'sfOrgManager.removeCategory',
    ];
    for (const command of expected) {
      assert.ok(commands.includes(command), `expected command ${command} to be registered`);
    }
  });
});
