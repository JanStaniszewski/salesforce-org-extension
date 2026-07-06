# Copy Auth URL — Design

**Date:** 2026-07-06
**Status:** Approved for planning

## Cel

Dodać akcję pozwalającą skopiować do schowka "SFDX Auth URL" danej orgi — pełny refresh token w formacie `force://...`, zwracany przez `sf org display --target-org <username> --verbose --json` w polu `sfdxAuthUrl`. Ten string jest równoważny pełnemu poświadczeniu (pozwala zalogować się jako dana orga bez przeglądarki/MFA), więc jest traktowany jako sekret w całym projekcie.

## OrgService: pobieranie Auth URL

Nowa metoda w `src/services/orgService.ts`:

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

- **Brak cache'owania.** W przeciwieństwie do `getOrgDetails` (cache'owany `Map<string, OrgDetails>`), `getAuthUrl` woła CLI na świeżo przy każdym wywołaniu — sekret nie powinien siedzieć w pamięci `OrgService` dłużej niż to konieczne do jednorazowego skopiowania.
- `src/cli/sfCli.ts` zyskuje nowy eksportowany typ `SfOrgDisplayVerboseResult extends SfOrgDisplayResult { sfdxAuthUrl?: string }` — pole opcjonalne, bo `--verbose` teoretycznie może go nie zwrócić (np. inny sposób autoryzacji, starsza wersja CLI).
- `username` pochodzi zawsze z `sf org list --json` (jak w pozostałych metodach `OrgService`) — nie jest wolnym tekstem, więc nie wymaga walidacji jak `alias`/`instanceUrl` w `loginWeb`.

## Komenda: `sfOrgManager.copyAuthUrl`

Nowy handler w `src/commands/orgActions.ts`, ten sam wzorzec co pozostałe akcje (normalizacja argumentu przez `toOrgSummary`, try/catch, komunikat po polsku):

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

Brak modalnego potwierdzenia przed skopiowaniem (świadoma decyzja — jedyny "safety net" to przypomnienie w treści notification po skopiowaniu) i brak automatycznego czyszczenia schowka po czasie (świadoma decyzja — prostsze, bez dodatkowej logiki z timerami).

## Umiejscowienie w UI

Wyłącznie w `package.json`'s `contributes.menus["view/item/context"]` (z `when: "view == sfOrgManagerView && viewItem == org"`), obok istniejących akcji. **Nie** dodajemy odpowiednika `OrgActionItem` w rozwiniętym drzewku (`OrgTreeProvider.getOrgChildren`) — w przeciwieństwie do "Ustaw jako domyślną"/"Otwórz w przeglądarce"/"Odśwież token", które są tam celowo widoczne. Powód: to jedyna akcja operująca na sekretcie, więc zostaje dostępna tylko przez świadome prawoklik → wybór z menu, zamiast być stałym, zawsze widocznym wierszem przy każdym rozwinięciu orgi.

Nowa pozycja w `contributes.commands`:

```json
{ "command": "sfOrgManager.copyAuthUrl", "title": "Salesforce Org Manager: Copy Auth URL" }
```

(bez ikony — nie pojawia się w `view/title`, tylko w kontekstowym menu, więc ikona nie jest potrzebna).

## Testy

Unit test dla `OrgService.getAuthUrl` (ten sam wzorzec DI co reszta `orgService.test.ts`):
- zwraca `sfdxAuthUrl` z odpowiedzi CLI przy poprawnym JSON-ie,
- rzuca błąd, gdy `sfdxAuthUrl` jest nieobecne w odpowiedzi,
- **nie cache'uje** — dwa kolejne wywołania `getAuthUrl` dla tego samego username powinny wywołać CLI dwa razy (w przeciwieństwie do `getOrgDetails`).

Komenda `copyAuthUrl` w `orgActions.ts` nie ma dedykowanego unit testu (podobnie jak pozostałe komendy — zależą od `vscode` API, pokryte tylko przez manualną weryfikację i istniejący integration smoke test, który już sprawdza rejestrację wszystkich komend — lista oczekiwanych komend w `test/suite/extension.test.ts` zyskuje `sfOrgManager.copyAuthUrl`).

## Poza zakresem (out of scope)

- Modalne potwierdzenie przed skopiowaniem — odrzucone, kopiujemy od razu.
- Automatyczne czyszczenie schowka po czasie — odrzucone, bez dodatkowej logiki z timerami.
- Wiersz-akcja w rozwiniętym drzewku (`OrgActionItem`) — celowo tylko menu kontekstowe.
