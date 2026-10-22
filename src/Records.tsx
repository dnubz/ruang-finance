import { useState } from "react";
import { Plus, Pencil, Trash2, Wallet, Target, Landmark } from "lucide-react";
import { useStore } from "./store";
import { balances, monthly, payoff, uid, today, type State } from "./model";
import {
  DataForm,
  Empty,
  Modal,
  Panel,
  Progress,
  Stat,
  number,
  useMoney,
  type Field,
} from "./ui";
type Kind = "Accounts" | "Assets" | "Debts" | "Goals" | "Budget" | "Recurring";
export default function Records({
  kind,
  month,
}: {
  kind: Kind;
  month: string;
}) {
  const { s, update, notify } = useStore(),
    money = useMoney();
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null),
    [remove, setRemove] = useState<string | null>(null);
  const key = (
    {
      Accounts: "accounts",
      Assets: "assets",
      Debts: "debts",
      Goals: "goals",
      Budget: "budgets",
      Recurring: "recurring",
    } as const
  )[kind];
  const list = s[key].filter(
    (x) => key !== "budgets" || ("month" in x && x.month === month),
  );
  const b = balances(s),
    m = monthly(s, month);
  const base = [{ name: "name", label: "Name", value: edit?.name as string }];
  const num = (name: string, label: string): Field => ({
    name,
    label,
    type: "number",
    value: (edit?.[name] as number) || 0,
  });
  const select = (name: string, label: string, options: string[]): Field => ({
    name,
    label,
    type: "select",
    options,
    value: edit?.[name] as string,
  });
  const fields: Field[] =
    kind === "Accounts"
      ? [
          ...base,
          select("type", "Account type", ["Cash", "Savings", "Investment"]),
          num("opening", "Opening balance · IDR"),
        ]
      : kind === "Assets"
        ? [
            ...base,
            select("type", "Asset class", [
              "Stocks",
              "ETFs",
              "Bonds",
              "Gold",
              "Crypto",
              "Mutual Funds",
              "Deposits",
              "Property",
              "Vehicle",
              "Business",
              "Other",
            ]),
            num("value", "Current value · IDR"),
            num("cost", "Purchase cost · IDR"),
          ]
        : kind === "Debts"
          ? [
              ...base,
              num("balance", "Outstanding balance · IDR"),
              num("rate", "Annual interest rate · %"),
              num("payment", "Monthly payment · IDR"),
              {
                name: "due",
                label: "Next payment due",
                type: "date",
                value: (edit?.due as string) || today(),
              },
            ]
          : kind === "Goals"
            ? [
                ...base,
                num("target", "Target · IDR"),
                num("saved", "Amount saved · IDR"),
                {
                  name: "due",
                  label: "Target date",
                  type: "date",
                  value: (edit?.due as string) || today(),
                },
              ]
            : kind === "Budget"
              ? [
                  select(
                    "category",
                    "Category",
                    s.categories.map((c) => c.name),
                  ),
                  {
                    name: "month",
                    label: "Month",
                    type: "month",
                    value: (edit?.month as string) || month,
                  },
                  num("limit", "Monthly limit · IDR"),
                ]
              : [
                  ...base,
                  num("amount", "Amount · IDR"),
                  select(
                    "category",
                    "Category",
                    s.categories.map((c) => c.name),
                  ),
                  {
                    name: "account",
                    label: "Payment account",
                    type: "select",
                    options: s.accounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                    value: edit?.account as string,
                  },
                  {
                    name: "due",
                    label: "Next due date",
                    type: "date",
                    value: (edit?.due as string) || today(),
                  },
                ];
  async function save(d: Record<string, string>) {
    let record: Record<string, unknown> = { id: edit?.id || uid(), ...d };
    const nums =
      kind === "Accounts"
        ? ["opening"]
        : kind === "Assets"
          ? ["value", "cost"]
          : kind === "Debts"
            ? ["balance", "rate", "payment"]
            : kind === "Goals"
              ? ["target", "saved"]
              : kind === "Budget"
                ? ["limit"]
                : ["amount"];
    for (const k of nums)
      record[k] = number(d, k, ["target", "limit", "amount"].includes(k));
    if (
      kind === "Budget" &&
      s.budgets.some(
        (x) =>
          x.category === d.category &&
          x.month === d.month &&
          x.id !== record.id,
      )
    )
      throw Error(
        "A budget already exists for this category and month. Edit that budget instead.",
      );
    if (
      await update(
        (v) =>
          ({
            ...v,
            [key]: edit?.id
              ? v[key].map((x) => (x.id === edit.id ? record : x))
              : [...v[key], record],
          }) as State,
      )
    ) {
      setEdit(null);
      notify(kind.slice(0, -1) + " saved on this device");
    }
  }
  async function erase() {
    if (kind === "Accounts" && s.accounts.length === 1) {
      notify("Keep at least one account.");
      return;
    }
    if (
      kind === "Accounts" &&
      (s.transactions.some((t) => t.account === remove || t.to === remove) ||
        s.recurring.some((r) => r.account === remove) ||
        s.favorites.some((r) => r.account === remove))
    ) {
      notify(
        "This account is used by transactions, bills, or shortcuts. Keep it to preserve your history.",
      );
      setRemove(null);
      return;
    }
    if (
      await update(
        (v) =>
          ({ ...v, [key]: v[key].filter((x) => x.id !== remove) }) as State,
      )
    ) {
      setRemove(null);
      notify("Record deleted");
    }
  }
  async function logBill(id: string) {
    const bill = s.recurring.find((r) => r.id === id)!;
    const next = new Date(bill.due + "T12:00:00");
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(
      Math.min(
        day,
        new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
      ),
    );
    await update((v) => ({
      ...v,
      transactions: [
        ...v.transactions,
        {
          id: uid(),
          type: "expense",
          amount: bill.amount,
          merchant: bill.name,
          category: bill.category,
          account: bill.account,
          to: "",
          date: bill.due,
          notes: "Recorded from recurring bill",
          tags: "recurring",
          subcategory: "",
        },
      ],
      recurring: v.recurring.map((r) =>
        r.id === id ? { ...r, due: next.toLocaleDateString("en-CA") } : r,
      ),
    }));
    notify("Payment recorded; next due date advanced");
  }
  const subtitle = {
    Accounts:
      "Every pocket, in one place. Account balances update with your transactions.",
    Assets:
      "A home for the things you own. Exclude values already in your accounts.",
    Debts:
      "A clearer path to being debt-free. Payments here are planning figures.",
    Goals:
      "Make a little room for your next big thing. Goal amounts are earmarks, not additional assets.",
    Budget: "Give every rupiah a little direction.",
    Recurring: "Know what’s coming. Record payments when you make them.",
  }[kind];
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR FINANCIAL SPACE</span>
          <h1>{kind === "Budget" ? "Your monthly plan" : kind}</h1>
          <p>{subtitle}</p>
        </div>
        <button className="primary" onClick={() => setEdit({})}>
          <Plus size={16} /> Add{" "}
          {kind === "Budget" ? "budget" : kind.toLowerCase().replace(/s$/, "")}
        </button>
      </div>
      <div className="record-grid">
        {list.map((x) => {
          const r = x as unknown as Record<string, any>;
          const used =
            kind === "Budget"
              ? m.tx
                  .filter(
                    (t) => t.type === "expense" && t.category === r.category,
                  )
                  .reduce((a, t) => a + t.amount, 0)
              : 0;
          const months =
            kind === "Debts" ? payoff(r.balance, r.rate, r.payment) : 0;
          return (
            <Panel key={r.id}>
              <div className="record-top">
                <span className="record-icon">
                  {kind === "Goals" ? (
                    <Target size={22} />
                  ) : kind === "Accounts" ? (
                    <Wallet size={22} />
                  ) : (
                    <Landmark size={22} />
                  )}
                </span>
                <div className="row-actions">
                  <button
                    aria-label={"Edit " + (r.name || r.category)}
                    onClick={() => setEdit(r)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    aria-label={"Delete " + (r.name || r.category)}
                    onClick={() => setRemove(r.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <span className="eyebrow">{r.type || kind}</span>
              <h3>{r.name || r.category}</h3>
              <div className="record-value">
                {money(
                  kind === "Accounts"
                    ? b[r.id]
                    : kind === "Assets"
                      ? r.value
                      : kind === "Debts"
                        ? r.balance
                        : kind === "Goals"
                          ? r.saved
                          : kind === "Budget"
                            ? used
                            : r.amount,
                )}
              </div>
              {kind === "Accounts" && <p>Opening balance {money(r.opening)}</p>}
              {kind === "Assets" && (
                <p className={r.value >= r.cost ? "positive" : "negative"}>
                  {money(r.value - r.cost)} gain / loss ·{" "}
                  {r.cost ? ((r.value / r.cost - 1) * 100).toFixed(1) : "—"}%
                </p>
              )}
              {kind === "Goals" && (
                <>
                  <Progress value={(r.saved / r.target) * 100} />
                  <p>
                    {Math.round((r.saved / r.target) * 100)}% of{" "}
                    {money(r.target)} · by {r.due}
                  </p>
                </>
              )}
              {kind === "Budget" && (
                <>
                  <Progress value={(used / r.limit) * 100} />
                  <p>
                    {money(Math.max(0, r.limit - used))} left of{" "}
                    {money(r.limit)}
                  </p>
                  <span
                    className={
                      "tag " + (used / r.limit >= 0.9 ? "negative" : "")
                    }
                  >
                    {Math.floor((used / r.limit) * 100)}% used ·{" "}
                    {used >= r.limit
                      ? "Over budget"
                      : used / r.limit >= 0.9
                        ? "90% threshold"
                        : used / r.limit >= 0.75
                          ? "75% threshold"
                          : used / r.limit >= 0.5
                            ? "50% threshold"
                            : "On track"}
                  </span>
                </>
              )}
              {kind === "Debts" && (
                <>
                  <p>
                    {r.rate}% APR · {money(r.payment)} / month
                  </p>
                  <div className="hint">
                    {isFinite(months)
                      ? `${months} months to payoff · estimated interest ${money(Math.max(0, months * r.payment - r.balance))}`
                      : "Payment does not cover interest. Increase the monthly payment."}
                    <br />
                    Next due {r.due}. Projection assumes a fixed rate and no new
                    borrowing.
                  </div>
                </>
              )}
              {kind === "Recurring" && (
                <>
                  <p>
                    Due {r.due} · {money(r.amount * 12)} / year
                  </p>
                  <button className="secondary" onClick={() => logBill(r.id)}>
                    Record payment
                  </button>
                </>
              )}
            </Panel>
          );
        })}
      </div>
      {!list.length && (
        <Panel>
          <Empty text={`Your ${kind.toLowerCase()} will live here.`}>
            <button onClick={() => setEdit({})}>Add your first record ↗</button>
          </Empty>
        </Panel>
      )}
      {kind === "Goals" && (
        <Panel
          title="Your emergency cushion"
          subtitle="A planning estimate based on the selected month’s expenses."
        >
          <div className="monthly-grid">
            {[3, 6, 12].map((n) => (
              <Stat
                key={n}
                label={n + " months of expenses"}
                value={money(m.expenses * n)}
              />
            ))}
          </div>
        </Panel>
      )}
      {kind === "Budget" && (
        <Panel
          title="Where should my money go?"
          subtitle="Illustrative planning templates. Adjust to your circumstances; future outcomes are not guaranteed."
        >
          <Allocation income={m.income} money={money} />
        </Panel>
      )}
      {edit && (
        <Modal
          title={
            (edit.id ? "Edit " : "Add ") +
            (kind === "Budget"
              ? "budget"
              : kind.toLowerCase().replace(/s$/, ""))
          }
          onClose={() => setEdit(null)}
        >
          <DataForm
            fields={fields}
            onSave={save}
            onCancel={() => setEdit(null)}
          />
        </Modal>
      )}
      {remove && (
        <Modal title="Delete this record?" onClose={() => setRemove(null)}>
          <p>
            This changes your locally stored records. Export a backup in
            Settings if you want to keep a copy.
          </p>
          <div className="form-actions">
            <button className="secondary" onClick={() => setRemove(null)}>
              Keep record
            </button>
            <button className="danger" onClick={erase}>
              Delete record
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Allocation({
  income,
  money,
}: {
  income: number;
  money: (n: number) => string;
}) {
  const [strategy, setStrategy] = useState("Balanced"),
    [custom, setCustom] = useState([50, 20, 20, 10]);
  const templates: Record<string, number[]> = {
    Balanced: [50, 20, 20, 10],
    "50 / 30 / 20": [50, 20, 0, 30],
    "Aggressive Saving": [45, 40, 10, 5],
    "Aggressive Investing": [45, 15, 35, 5],
    "Debt Payoff": [50, 10, 30, 10],
    Custom: custom,
  };
  const labels =
    strategy === "Debt Payoff"
      ? [
          "Living expenses",
          "Emergency savings",
          "Extra debt payments",
          "Fun money",
        ]
      : ["Living expenses", "Savings", "Investments", "Fun money"];
  const amounts = templates[strategy];
  return (
    <>
      <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
        {Object.keys(templates).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <div className="monthly-grid">
        {amounts.map((p, i) => (
          <div key={i}>
            <Stat
              label={labels[i] + " · " + p + "%"}
              value={money((income * p) / 100)}
            />
            {strategy === "Custom" && (
              <input
                aria-label={labels[i] + " percentage"}
                type="number"
                min="0"
                max="100"
                value={custom[i]}
                onChange={(e) =>
                  setCustom(
                    custom.map((n, j) =>
                      i === j
                        ? Math.max(0, Math.min(100, Number(e.target.value)))
                        : n,
                    ),
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
      {amounts.reduce((a, v) => a + v, 0) !== 100 && (
        <p className="error">Adjust custom percentages to total 100%.</p>
      )}
      <p className="hint">
        Living expenses cover essentials; savings build a cushion; investments
        target longer horizons; fun money keeps the plan sustainable. Debt
        payoff prioritizes outstanding balances. These are starting points,
        calculated from selected-month income.
      </p>
    </>
  );
}
