import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Wallet,
  Landmark,
  TrendingUp,
  Target,
  CalendarDays,
  FileChartColumn,
  Settings as SettingsIcon,
  Plus,
  Search,
  Bell,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Repeat,
  CreditCard,
  Menu,
  Sun,
  Moon,
  LockKeyhole,
} from "lucide-react";
import { useStore } from "./store";
import { monthNow, today, type Transaction } from "./model";
import { pinHash } from "./db";
import { Panel, TransactionsTable, Modal } from "./ui";
import Dashboard from "./Dashboard";
import TransactionModal from "./TransactionModal";
import Records from "./Records";
import Analytics from "./Analytics";
import Settings from "./Settings";
import Investments from "./Investments";
import Calendar from "./Calendar";
import Assistant from "./Assistant";
const navigation = [
  ["Dashboard", LayoutDashboard],
  ["Transactions", ArrowLeftRight],
  ["Budget", ChartNoAxesCombined],
  ["Accounts", Wallet],
  ["Assets", Landmark],
  ["Investments", TrendingUp],
  ["Goals", Target],
  ["Debts", CreditCard],
  ["Recurring", Repeat],
  ["Analytics", ChartNoAxesCombined],
  ["Calendar", CalendarDays],
  ["Reports", FileChartColumn],
  ["Assistant", Sparkles],
  ["Settings", SettingsIcon],
] as const;
export default function App() {
  const { s, update, saving, error, notice } = useStore();
  const [page, setPage] = useState("Dashboard"),
    [month, setMonth] = useState(monthNow()),
    [modal, setModal] = useState<Partial<Transaction> | null>(null),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [category, setCategory] = useState("all"),
    [menu, setMenu] = useState(false),
    [alerts, setAlerts] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null),
    [locked, setLocked] = useState(Boolean(s.settings.pin)),
    [pin, setPin] = useState(""),
    [pinError, setPinError] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = s.settings.theme;
  }, [s.settings.theme]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!locked) setModal({});
      }
      if (e.key === "Escape") {
        setModal(null);
        setMenu(false);
        setAlerts(false);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [locked]);
  const navigate = (p: string) => {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const due = s.recurring.filter(
    (r) =>
      r.due <= new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA"),
  );
  const matches = s.transactions.filter((t) => {
    const hay = [
      t.merchant,
      t.amount,
      t.category,
      t.date,
      t.tags,
      t.notes,
      s.accounts.find((a) => a.id === t.account)?.name,
      new Date(t.date + "T12:00:00").toLocaleDateString("en-GB", {
        month: "long",
      }),
    ]
      .join(" ")
      .toLowerCase();
    return (
      query
        .toLowerCase()
        .split(/\s+/)
        .every((q) => hay.includes(q)) &&
      t.date.startsWith(month) &&
      (type === "all" || t.type === type) &&
      (category === "all" || t.category === category)
    );
  });
  if (locked)
    return (
      <div className="boot">
        <div className="brandmark">r.</div>
        <LockKeyhole size={24} />
        <h1>A little privacy for your money.</h1>
        <form
          className="lock-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if ((await pinHash(pin, s.settings.salt)) === s.settings.pin) {
              setLocked(false);
              setPin("");
            } else setPinError("That PIN doesn’t match.");
          }}
        >
          <input
            aria-label="PIN"
            autoFocus
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
          />
          <button className="primary">Unlock Ruang</button>
          {pinError && <p className="error">{pinError}</p>}
        </form>
        <p className="hint">Screen lock only. Local data is not encrypted.</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("Dashboard");
          }}
        >
          <span className="brandmark">r.</span>ruang
          <span className="brand-dot">®</span>
        </a>
        <span className="sidebar-label">YOUR MONEY, A LITTLE CLEARER</span>
        <nav>
          {navigation.map(([name, Icon], i) => (
            <div key={name}>
              {i === 5 && (
                <span className="nav-divider">GROW & UNDERSTAND</span>
              )}
              {i === 13 && <span className="nav-divider" />}
              <button
                className={page === name ? "selected" : ""}
                onClick={() => navigate(name)}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === "Assistant" && (
                  <span className="new-badge">LOCAL</span>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-note">
            <ShieldCheck size={18} />
            <span>
              Just you and your data.<small>Stored on this device.</small>
            </span>
          </div>
          <button className="profile" onClick={() => navigate("Settings")}>
            <span className="avatar">
              {s.settings.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <b>{s.settings.name}</b>
              <small>Personal space</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-toggle icon-btn"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              My workspace <span>/</span> <b>{page}</b>
            </span>
          </div>
          <div className="topbar-actions">
            <span className={"save-status " + (error ? "negative" : "")}>
              <i />
              {error ? "Save failed" : saving ? "Saving…" : "Saved on device"}
            </span>
            <button
              className="icon-btn"
              aria-label="Toggle theme"
              onClick={() =>
                update((v) => ({
                  ...v,
                  settings: {
                    ...v.settings,
                    theme: v.settings.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {s.settings.theme === "light" ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </button>
            <button
              className="icon-btn bell"
              aria-label="View notifications"
              onClick={() => setAlerts(!alerts)}
            >
              <Bell size={18} />
              {due.length > 0 && <i />}
            </button>
            {s.settings.pin && (
              <button
                className="icon-btn"
                aria-label="Lock app"
                onClick={() => setLocked(true)}
              >
                <LockKeyhole size={17} />
              </button>
            )}
            <span className="avatar small">
              {s.settings.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main>
          <div className="toolbar">
            <span className="date-line">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <div>
              <label className="month-picker">
                <CalendarDays size={15} />
                <input
                  aria-label="Selected month"
                  type="month"
                  value={month}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                />
              </label>
              <button className="primary" onClick={() => setModal({})}>
                <Plus size={17} /> Add transaction
              </button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error} Your last successful save remains intact. Check browser
              storage and try again.
            </div>
          )}
          {s.settings.demo && (
            <div className="demo-banner">
              You’re viewing sample data.{" "}
              <button onClick={() => navigate("Settings")}>
                Manage / clear demo data ↗
              </button>
            </div>
          )}
          {page === "Dashboard" ? (
            <Dashboard
              month={month}
              add={(t) => setModal(t || {})}
              navigate={navigate}
            />
          ) : page === "Transactions" ? (
            <>
              <div className="section-title">
                <div>
                  <span className="eyebrow">THE EVERYDAY, ACCOUNTED FOR</span>
                  <h1>Your transactions</h1>
                  <p>Little moments. A clearer picture.</p>
                </div>
              </div>
              <Panel>
                <div className="filters">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search transactions"
                      placeholder="Search merchant, amount, tag, account…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Transaction type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">All types</option>
                    {["expense", "income", "transfer"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">All categories</option>
                    {s.categories.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <TransactionsTable
                  s={s}
                  ids={matches.map((t) => t.id)}
                  onEdit={(id) =>
                    setModal(s.transactions.find((t) => t.id === id)!)
                  }
                  onDelete={setDeleteId}
                />
                <p className="hint">
                  {matches.length} transactions · filtered to {month}. Change
                  the month above to view another period.
                </p>
              </Panel>
            </>
          ) : [
              "Accounts",
              "Assets",
              "Debts",
              "Goals",
              "Budget",
              "Recurring",
            ].includes(page) ? (
            <Records key={page} kind={page as "Accounts"} month={month} />
          ) : page === "Analytics" || page === "Reports" ? (
            <Analytics month={month} reports={page === "Reports"} />
          ) : page === "Settings" ? (
            <Settings />
          ) : page === "Investments" ? (
            <Investments />
          ) : page === "Calendar" ? (
            <Calendar month={month} />
          ) : (
            <Assistant month={month} />
          )}
        </main>
      </div>
      <nav className="bottom-nav">
        {navigation.slice(0, 5).map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? "selected" : ""}
            onClick={() => navigate(name)}
          >
            <Icon size={19} />
            <small>{name}</small>
          </button>
        ))}
        <button onClick={() => setMenu(!menu)}>
          <Menu size={19} />
          <small>More</small>
        </button>
      </nav>
      {modal && (
        <TransactionModal initial={modal} onClose={() => setModal(null)} />
      )}
      <button
        className="floating-add"
        aria-label="Quick add transaction"
        onClick={() => setModal({})}
      >
        <Plus size={24} />
      </button>
      {notice && (
        <div role="status" className="toast">
          <ShieldCheck size={18} />
          {notice}
        </div>
      )}
      {alerts && (
        <Modal
          title="A few things on the horizon"
          onClose={() => setAlerts(false)}
        >
          {due.length ? (
            due.map((r) => (
              <div className="list-row" key={r.id}>
                <b>{r.name}</b>
                <span>Due {r.due}</span>
              </div>
            ))
          ) : (
            <p>
              You’re all caught up. No recurring bills due in the next three
              days.
            </p>
          )}
          <p className="hint">
            Notifications appear while you use the app; no background push
            reminders.
          </p>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="Delete this transaction?"
          onClose={() => setDeleteId(null)}
        >
          <p>
            Your account balances will be recalculated. This removes the
            transaction from this device.
          </p>
          <div className="form-actions">
            <button onClick={() => setDeleteId(null)}>Cancel</button>
            <button
              className="danger"
              onClick={async () => {
                if (
                  await update((v) => ({
                    ...v,
                    transactions: v.transactions.filter(
                      (t) => t.id !== deleteId,
                    ),
                  }))
                )
                  setDeleteId(null);
              }}
            >
              Delete transaction
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
