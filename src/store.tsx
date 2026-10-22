import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadState, saveState, restoreText, readRawSavedData } from "./db";
import { today, wealth, type State } from "./model";
type Store = {
  s: State;
  update: (fn: (s: State) => State) => Promise<boolean>;
  saving: boolean;
  error: string;
  notice: string;
  notify: (s: string) => void;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [notice, notify] = useState("");
  const current = useRef<State | null>(null),
    queue = useRef(Promise.resolve());
  useEffect(() => {
    loadState()
      .then((v) => {
        current.current = v;
        set(v);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => notify(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const c = new BroadcastChannel("ruang-finance");
    c.onmessage = () => {
      loadState()
        .then((v) => {
          current.current = v;
          set(v);
        })
        .catch((e) => setError(e.message));
    };
    return () => c.close();
  }, []);
  async function update(fn: (s: State) => State) {
    let success = false;
    const work = async () => {
      setSaving(true);
      try {
        const perform = async () => {
          const latest = await loadState();
          const next = fn(structuredClone(latest));
          const date = today();
          next.snapshots = [
            ...next.snapshots.filter((x) => x.date !== date),
            { date, value: wealth(next).net },
          ].sort((a, b) => a.date.localeCompare(b.date));
          await saveState(next);
          current.current = next;
          set(next);
          setError("");
          success = true;
          const c = new BroadcastChannel("ruang-finance");
          c.postMessage("saved");
          c.close();
        };
        if (navigator.locks)
          await navigator.locks.request("ruang-write", perform);
        else await perform();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Saving failed. Please export a backup and check browser storage.",
        );
      } finally {
        setSaving(false);
      }
    };
    queue.current = queue.current.then(work, work);
    await queue.current;
    return success;
  }
  if (!s)
    return (
      <div className="boot">
        <div className="brandmark">r.</div>
        <h1>
          {error ? "Your data needs attention" : "Making room for your money…"}
        </h1>
        <p>{error || "Opening your local database"}</p>
        {error && (
          <>
            <button onClick={() => location.reload()}>Try again</button>
            <button
              onClick={async () => {
                const data = await readRawSavedData();
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "ruang-recovery.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download preserved data for recovery
            </button>
            <label>
              Restore a valid JSON backup (replaces saved data)
              <input
                type="file"
                accept=".json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const v = restoreText(await f.text());
                    await saveState(v);
                    current.current = v;
                    set(v);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
          </>
        )}
      </div>
    );
  return (
    <Context.Provider value={{ s, update, saving, error, notice, notify }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const v = useContext(Context);
  if (!v) throw Error("Missing store");
  return v;
}
