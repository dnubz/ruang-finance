import { useState, type ReactNode, type FormEvent } from "react";
import { X, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useStore } from "./store";
import { parseAmount, type State } from "./model";
export function useMoney() {
  const { s } = useStore();
  return (n: number, compact = false) =>
    new Intl.NumberFormat(s.settings.currency === "IDR" ? "id-ID" : "en-US", {
      style: "currency",
      currency: s.settings.currency,
      maximumFractionDigits: 0,
      ...(compact ? { notation: "compact" as const } : {}),
    }).format(n * s.settings.fx);
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <div className="panel-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  text = "A little space for a fresh start.",
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>↗</span>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <i
        style={{
          width: Math.min(100, Math.max(0, value)) + "%",
          background: color || (value >= 100 ? "var(--red)" : "var(--green)"),
        }}
      />
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: "number" | "date" | "month" | "select" | "text" | "password";
  options?: string[] | { value: string; label: string }[];
  value?: string | number;
  required?: boolean;
  placeholder?: string;
};
export function DataForm({
  fields,
  onSave,
  onCancel,
  saveLabel = "Save changes",
}: {
  fields: Field[];
  onSave: (data: Record<string, string>) => Promise<boolean | void>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    setBusy(true);
    try {
      await onSave(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="data-form">
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.type === "select" ? (
            <select
              name={f.name}
              defaultValue={f.value}
              required={f.required !== false}
            >
              {f.options?.map((o) => (
                <option
                  key={typeof o === "string" ? o : o.value}
                  value={typeof o === "string" ? o : o.value}
                >
                  {typeof o === "string" ? o : o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={f.name}
              type={f.type === "number" ? "text" : f.type || "text"}
              inputMode={f.type === "number" ? "decimal" : undefined}
              defaultValue={f.value ?? ""}
              placeholder={f.placeholder}
              required={f.required !== false}
              autoComplete="off"
            />
          )}
        </label>
      ))}
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : saveLabel}
        </button>
      </div>
    </form>
  );
}
export const number = (
  d: Record<string, string>,
  key: string,
  positive = false,
) => {
  const n = parseAmount(d[key]);
  if (!Number.isFinite(n) || n < 0 || (positive && n === 0))
    throw Error("Enter a valid " + key + " (you can use 35k or 2.5jt).");
  return n;
};
export function Stat({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small className={positive ? "positive" : ""}>{detail}</small>}
    </div>
  );
}
export function TransactionsTable({
  s,
  ids,
  onEdit,
  onDelete,
}: {
  s: State;
  ids?: string[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const money = useMoney();
  const rows = [...s.transactions]
    .filter((t) => !ids || ids.includes(t.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length)
    return <Empty text="Your next transaction starts the story." />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Category</th>
            <th>Account</th>
            <th>Date</th>
            <th className="right">Amount</th>
            {onEdit && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="merchant">
                  <span className={"merchant-icon " + t.type}>
                    {t.type === "income" ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <div>
                    <b>{t.merchant}</b>
                    {t.tags && <small>{t.tags}</small>}
                  </div>
                </div>
              </td>
              <td>
                <span className="tag">{t.category}</span>
              </td>
              <td>
                {s.accounts.find((a) => a.id === t.account)?.name}
                {t.type === "transfer" &&
                  " → " + s.accounts.find((a) => a.id === t.to)?.name}
              </td>
              <td>
                {new Date(t.date + "T12:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td
                className={
                  "right amount " + (t.type === "income" ? "positive" : "")
                }
              >
                {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                {money(t.amount)}
              </td>
              {onEdit && (
                <td>
                  <div className="row-actions">
                    <button onClick={() => onEdit(t.id)}>Edit</button>
                    <button onClick={() => onDelete?.(t.id)}>Delete</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function download(
  text: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
