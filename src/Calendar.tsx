import { useStore } from "./store";
import { Panel, useMoney } from "./ui";
export default function Calendar({ month }: { month: string }) {
  const { s } = useStore(),
    money = useMoney();
  const start = new Date(month + "-01T12:00:00"),
    offset = (start.getDay() + 6) % 7,
    days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const events = [
    ...s.recurring.map((x) => ({
      id: x.id,
      date: x.due,
      name: x.name,
      amount: x.amount,
      type: "Bill",
    })),
    ...s.debts.map((x) => ({
      id: x.id,
      date: x.due,
      name: x.name,
      amount: x.payment,
      type: "Debt payment",
    })),
    ...s.goals.map((x) => ({
      id: x.id,
      date: x.due,
      name: x.name,
      amount: x.target - x.saved,
      type: "Goal",
    })),
    ...s.transactions
      .filter((t) => t.type === "income")
      .map((x) => ({
        id: x.id,
        date: x.date,
        name: x.merchant,
        amount: x.amount,
        type: "Income",
      })),
  ]
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">AHEAD OF THE EVERYDAY</span>
          <h1>Your finance calendar</h1>
          <p>A little heads-up for the month ahead.</p>
        </div>
      </div>
      <Panel>
        <div className="calendar">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <b key={d} className="day-name">
              {d}
            </b>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={"blank" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = month + "-" + String(i + 1).padStart(2, "0");
            return (
              <div className="day" key={d}>
                <b>{i + 1}</b>
                {events
                  .filter((e) => e.date === d)
                  .map((e) => (
                    <span key={e.id} title={e.name + " · " + money(e.amount)}>
                      {e.name}
                    </span>
                  ))}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="On the horizon">
        {events.length ? (
          events.map((e) => (
            <div className="list-row" key={e.id}>
              <span className="tag">{e.date.slice(-2)}</span>
              <b>{e.name}</b>
              <span>{e.type}</span>
              <span>{money(e.amount)}</span>
            </div>
          ))
        ) : (
          <p>
            No scheduled items in this month. Add recurring bills, debt due
            dates, or goal deadlines.
          </p>
        )}
      </Panel>
    </>
  );
}
