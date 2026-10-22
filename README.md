# Ruang Finance

A personal finance dashboard built with React, TypeScript, Vite, Recharts and IndexedDB. No account or backend is required. Financial records stay in the current browser profile, on the current app origin.

## Run locally

Requires Node.js 22.12+ (or a newer supported LTS).

```sh
npm ci
npm run dev
```

Keep the same localhost port when reopening the app: browser storage belongs to an origin, which includes the port. A hosted address has separate storage from localhost. To move records, export a full JSON backup and restore it at the new address.

## Features

- Quick entry: `35k Grab`, `income 5m Freelance`, Ctrl/Cmd+K, merchant memory and favorite shortcuts.
- Transactions with search, category/type/month filters, editing, deletion and transfers.
- Accounts, assets, debts with payoff estimates, savings goals, monthly budgets, recurring bills and calendar.
- Dashboard, cash-flow charts, local rules-based assistant, monthly/quarterly/yearly JSON reports.
- Manual investment valuations, allocation warnings, risk prompts, manual watchlist alerts, and optional on-demand public crypto quotes.
- Dark/light mode, IDR base currency with a manual display exchange rate, optional PIN screen lock.
- Full JSON backup/restore, transaction CSV export/import, browser persistent-storage request.

## Data persistence and privacy

Every edit is validated and committed to IndexedDB before the interface reports success. Failed writes retain the last committed data. The app does not seed or replace data on refresh. Clearing demo data persists an empty dataset. Browser tabs coordinate saves with Web Locks where supported and receive updates through BroadcastChannel.

Closing the browser does not clear IndexedDB. Clearing site data, private browsing, device failure, or browser eviction may remove records. Export regular backups in Settings → Data & backups. JSON contains all data and preferences; CSV contains transactions and requires existing matching account IDs on import. JSON restore replaces the dataset after confirmation; CSV merges and skips duplicate IDs. Backups are plaintext: keep them private and outside this repository. The PIN is a convenience screen lock, not encryption.

Account opening balances and transaction flows determine account balances. Transfers never count as income or expenses. Savings/investment contributions are net transfers into those account types. Goal amounts are earmarks and are not added to wealth. Asset records should exclude values already represented by accounts. Net worth is all account balances plus manually valued assets minus outstanding debts. History consists of real daily snapshots recorded when changes are saved; the app does not invent earlier performance. Recurring bills are posted only when you click Record payment. Debt payments and goal amounts must be maintained manually; no bank connection or automatic reconciliation exists.

Investment content is educational. Stock prices, news, valuations, automatic FX, and background push alerts are not provided. Optional crypto quotes are fetched from CoinGecko only on request and may be unavailable or delayed; personal records are not included in the request. Google Fonts loads typography; no personal financial data is sent to that service. Financial guidance is deterministic and runs locally.

## Validate and build

```sh
npm test
npm run build
```

Tests cover durable database re-opening, failed-write protection, JSON/CSV restore validation, transfer accounting, balance recalculation and amount parsing.

## GitHub Pages

The included GitHub Actions workflow builds and tests every push. To enable deployment, select Settings → Pages → Source → GitHub Actions, add a repository Actions variable `ENABLE_PAGES` with the value `true`, and run the workflow. Pages availability for private repositories depends on your GitHub plan. Relative Vite asset paths support repository project URLs. Financial data and exports are never part of the deployed bundle. Hosting on another domain or changing repository URL creates a separate browser storage origin; use JSON backup/restore to migrate.
