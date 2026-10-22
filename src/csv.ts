import { txSchema, uid, type Transaction, type State } from "./model";
const headers = [
  "id",
  "type",
  "amount",
  "merchant",
  "category",
  "date",
  "account",
  "to",
  "subcategory",
  "notes",
  "tags",
] as const;
export function exportCsv(tx: Transaction[]) {
  return [
    headers.join(","),
    ...tx.map((t) =>
      headers
        .map((h) => '"' + String(t[h]).replace(/"/g, '""') + '"')
        .join(","),
    ),
  ].join("\r\n");
}
export function importCsv(text: string, s: State) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV has an unclosed quote.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const cols = rows.shift()?.map((x) => x.replace(/^\uFEFF/, ""));
  if (!cols || !headers.every((h) => cols.includes(h)))
    throw Error("Use a transaction CSV exported by Ruang.");
  const known = new Set(s.transactions.map((t) => t.id));
  const result: Transaction[] = [];
  for (const r of rows) {
    const data = Object.fromEntries(cols.map((c, i) => [c, r[i] || ""]));
    const t = txSchema.parse({
      ...data,
      id: data.id || uid(),
      amount: Number(data.amount),
    });
    if (
      !s.accounts.some((a) => a.id === t.account) ||
      (t.type === "transfer" &&
        (!s.accounts.some((a) => a.id === t.to) || t.to === t.account))
    )
      throw Error(
        "A CSV account is missing. Restore a full JSON backup to recover accounts first.",
      );
    if (!known.has(t.id)) {
      known.add(t.id);
      result.push(t);
    }
  }
  return result;
}
