# Salesforce Org Manager — VS Code Extension Design

**Date:** 2026-07-02
**Status:** Approved for planning

## Cel

VS Code extension ułatwiający zarządzanie autoryzowanymi orgami Salesforce. Dodaje nową zakładkę na Activity Bar, w której widoczne są wszystkie zautoryzowane orgi, można autoryzować nowe oraz podejrzeć/zarządzać informacjami o istniejących.

## Stack techniczny

- TypeScript + VS Code Extension API.
- Bundler: **esbuild**, package manager: **npm** (standardowy setup z generatora `yo code`, najlepiej przetestowany z `vsce package`).
- Brak własnej integracji OAuth — extension opiera się wyłącznie na lokalnie zainstalowanym **Salesforce CLI (`sf`)**, wywoływanym przez `child_process` z flagą `--json`.
- Przy starcie extension weryfikuje obecność CLI (`sf --version`); jeśli brak, pokazuje notification z linkiem do instalacji (https://developer.salesforce.com/tools/salesforcecli) zamiast się wywalać.

## Architektura

### OrgService

Centralny serwis opakowujący komendy CLI i cache'ujący wyniki:

- `sf org list --json` — lista wszystkich zautoryzowanych orgów: alias, username, typ (devhub/sandbox/scratch/production), status połączenia, data wygaśnięcia (scratch orgi), czy jest aktualnym target-org.
- `sf org display --target-org <alias> --json` — szczegóły pojedynczej orgi (Org ID, Instance URL, API version). Pobierane leniwie, dopiero przy pierwszym rozwinięciu danej orgi w drzewku, i cache'owane per alias.
- `sf org login web --alias <alias> --instance-url <url> --json` — autoryzacja nowej orgi / re-authentykacja wygasłej.
- `sf org logout --target-org <alias> --no-prompt` — wylogowanie.
- `sf config set target-org=<alias> --global` — ustawienie orgi jako domyślnej.
- `sf org open --target-org <alias>` — otwarcie orgi w przeglądarce.

Lista orgów (`org list`) jest cache'owana w pamięci i odświeżana: po każdej akcji mutującej (login/logout/set-default) oraz ręcznie przez przycisk Refresh w nagłówku widoku.

### Tree View

Nowa zakładka na Activity Bar (własna ikona) z `TreeDataProvider` grupującym orgi wg typu:

```
📁 Dev Hubs
📁 Sandboxes
📁 Scratch Orgs
📁 Production / Inne
```

Każdy węzeł orgi:
- ikona statusu: zielona = połączona, żółta/czerwona = token wygasł / błąd,
- label = alias (fallback: username, jeśli brak aliasu),
- description (szary tekst) = username + adnotacja „(domyślna)" jeśli to aktualny target-org.

Rozwinięcie węzła orgi (kliknięcie) doładowuje i pokazuje dzieci:
- wiersze ze szczegółami: Org ID, Instance URL, API version, (dla scratch orgów) data wygaśnięcia,
- klikalne pozycje-akcje z ikoną: `$(arrow-swap) Ustaw jako domyślną`, `$(link-external) Otwórz w przeglądarce`.

To podejście czysto drzewkowe (bez webview), spójne z UX innych extensions (np. AWS Toolkit, Salesforce Extension Pack) — prostsze w budowie niż osobny panel.

Prawoklik na orgę pokazuje menu kontekstowe z akcjami: Set Default, Open in Browser, Logout, Refresh Token (patrz niżej).

## Autoryzacja nowej orgi

Przycisk „+" w nagłówku widoku uruchamia flow:

1. QuickPick: `Production` / `Sandbox` / `Custom URL`.
2. Input box: alias dla orgi (opcjonalny — jeśli pusty, `sf` sam wygeneruje).
3. Zbudowanie `instance-url` (`login.salesforce.com` dla Production, `test.salesforce.com` dla Sandbox, wpisany URL dla Custom) i wywołanie:
   `sf org login web --alias <alias> --instance-url <url> --json`.
4. Progress notification ("Czekam na autoryzację w przeglądarce...") z opcją anulowania, aktywna do zakończenia procesu CLI (użytkownik loguje się w przeglądarce).
5. Sukces → refresh drzewka, nowa orga pojawia się automatycznie we właściwej grupie. Błąd (np. anulowane logowanie, zły URL) → notification z komunikatem błędu z CLI.

## Akcje i obsługa błędów

- **Set Default** → `sf config set target-org=<alias> --global`, potem refresh.
- **Open in Browser** → `sf org open --target-org <alias>`.
- **Logout** → modal potwierdzenia ("Na pewno wylogować `<alias>`?"), potem `sf org logout --target-org <alias> --no-prompt`, refresh.
- **Refresh Token** (widoczne gdy status = wygasły) → ponowne uruchomienie `sf org login web` dla danego aliasu (ten sam flow co reauth).
- **Manualny Refresh** (ikona w nagłówku widoku) → czyści cache, ponownie woła `sf org list --json`.
- Każdy błąd z CLI (parsowany z JSON `{status, message}` lub stderr) pokazywany przez `vscode.window.showErrorMessage` z oryginalną treścią błędu z CLI — bez własnych wymyślonych komunikatów.

## Testy

- **Unit testy** (Mocha, standardowy szablon VS Code extension) dla `OrgService` — mockowanie `child_process.exec`, weryfikacja parsowania JSON z `sf org list` / `sf org display` oraz poprawności budowanych komend.
- **Integration smoke test** (`@vscode/test-electron`) — rejestracja widoku, renderowanie drzewka, rejestracja komend z `package.json`.
- Testy E2E na prawdziwym logowaniu OAuth pominięte (wymagałyby prawdziwej orgi) — weryfikacja ręczna.

## Poza zakresem (out of scope)

- Własna integracja OAuth niezależna od CLI.
- Panel/webview ze szczegółami orgi (zastąpiony rozwijanymi węzłami drzewka).
- Podgląd limitów API, kopiowanie do schowka, otwieranie Setup danej orgi — odrzucone przy wyborze zakresu akcji.
