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
