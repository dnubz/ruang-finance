import { useState } from "react";
import { Sparkles } from "lucide-react";
import { monthly, wealth } from "./model";
import { useStore } from "./store";
import { Panel, useMoney } from "./ui";
export default function Assistant({ month }: { month: string }) {
  const { s } = useStore(),
    money = useMoney();
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState("");
  function ask(q: string) {
    setQuestion(q);
    const m = monthly(s, month),
      w = wealth(s);
    const groups = Object.entries(
      m.tx
        .filter((t) => t.type === "expense")
        .reduce<Record<string, number>>(
          (a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + t.amount }),
          {},
        ),
    ).sort((a, b) => b[1] - a[1]);
    const monthlyBills = s.recurring.reduce((v, r) => v + r.amount, 0);
    let result = "";
    if (/grab/i.test(q)) {
      const spent = m.tx
        .filter((t) => t.type === "expense" && /grab/i.test(t.merchant))
        .reduce((v, t) => v + t.amount, 0);
      result = `You recorded ${money(spent)} of Grab expenses in ${month}.`;
    } else if (/100|long|reach/i.test(q)) {
      const surplus = m.income - m.expenses;
      const gap = Math.max(0, 100000000 - w.net);
      result =
        gap === 0
          ? "Your current recorded net worth is already at least Rp100 million."
          : surplus > 0
            ? `At this month’s recorded surplus of ${money(surplus)}, closing the ${money(gap)} gap to Rp100 million would take about ${Math.ceil(gap / surplus)} months, assuming the same surplus and no changes in asset prices or debt. This is a simple scenario, not a forecast.`
            : "There is no positive recorded surplus this month to estimate a timeline. Start with a sustainable cash-flow plan.";
    } else if (/recurring|subscription/i.test(q)) {
      result = `Your listed recurring bills total ${money(monthlyBills)} a month (${money(monthlyBills * 12)} a year). ${s.recurring.map((r) => r.name + ": " + money(r.amount)).join("; ")}. Review whether each still serves you; the app cannot judge necessity from an amount alone.`;
    } else if (/invest|afford|safely|allocate/i.test(q)) {
      const cushion = m.expenses * 6;
      result = `You have ${money(m.remaining)} unallocated in ${month}, ${money(w.cash)} available cash, ${money(w.savings)} savings, and ${money(w.debt)} outstanding debt. Six months of this month’s expenses would be ${money(cushion)}. Compare essential upcoming bills, debt interest, and your emergency cushion before deciding what to invest. This app cannot determine a guaranteed safe investment amount.`;
    } else if (/save/i.test(q)) {
      result = `You transferred a net ${money(m.saved)} to savings this month (${m.rate.toFixed(1)}% of recorded income). Your unallocated amount is ${money(m.remaining)}. A six-month expense cushion based on this month would be ${money(m.expenses * 6)}. Decide a contribution after allowing for upcoming essentials.`;
    } else if (/where|most|spend|expenses/i.test(q)) {
      result = groups.length
        ? `Your largest spending category in ${month} is ${groups[0][0]} at ${money(groups[0][1])}. Total recorded expenses are ${money(m.expenses)}, against income of ${money(m.income)}. Open Analytics for comparisons with last month.`
        : "No expenses are recorded in this month yet.";
    } else
      result =
        "I can summarize recorded spending, Grab expenses, savings, recurring bills, allocation considerations, and a simple Rp100 million scenario. Try one of the prompts below.";
    setAnswer(result);
  }
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">A THOUGHTFUL SECOND LOOK</span>
          <h1>A little money clarity</h1>
          <p>Answers calculated on your device, from your actual records.</p>
        </div>
        <Sparkles size={36} className="positive" />
      </div>
      <Panel
        title="Your local financial assistant"
        subtitle="A rules-based assistant. Your questions and financial records stay in this browser."
      >
        <form
          className="assistant-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where did most of my money go this month?"
            required
          />
          <button className="primary">Ask ↗</button>
        </form>
        {answer && (
          <div className="assistant-answer">
            <Sparkles size={20} />
            <p>{answer}</p>
          </div>
        )}
        <div className="prompt-grid">
          {[
            "Where did most of my money go this month?",
            "How much am I spending on Grab?",
            "Can I afford to invest more?",
            "How long until I reach Rp100 million?",
            "How much should I save this month?",
            "Show my recurring expenses.",
          ].map((q) => (
            <button key={q} onClick={() => ask(q)}>
              {q} ↗
            </button>
          ))}
        </div>
        <p className="hint">
          Educational planning information, based only on the records you enter.
          Missing records can change the picture.
        </p>
      </Panel>
    </>
  );
}
