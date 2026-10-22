import { stateSchema, emptyState, type State } from "./model";
const DB = "ruang-finance";
let connection: Promise<IDBDatabase> | undefined;
function open() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      r.onsuccess = () => {
        r.result.onversionchange = () => {
          r.result.close();
          connection = undefined;
        };
        resolve(r.result);
      };
      r.onerror = () => {
        connection = undefined;
        reject(r.error);
      };
      r.onblocked = () =>
        reject(Error("Close other Ruang tabs to finish opening the database."));
    });
  return connection;
}
export async function loadState(): Promise<State> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("records", "readonly");
    const r = tx.objectStore("records").get("current");
    r.onsuccess = () => {
      try {
        resolve(
          r.result === undefined ? emptyState() : stateSchema.parse(r.result),
        );
      } catch {
        reject(
          Error(
            "Saved data could not be read. It has been preserved. Restore a known good backup to continue.",
          ),
        );
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function saveState(state: State) {
  const valid = stateSchema.parse(state);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").put(valid, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || Error("Could not save your changes."));
    tx.onabort = () =>
      reject(tx.error || Error("Storage write was interrupted."));
  });
}
export function backupText(s: State) {
  return JSON.stringify(
    { app: "ruang-finance", exportedAt: new Date().toISOString(), data: s },
    null,
    2,
  );
}
export function restoreText(text: string) {
  const parsed = JSON.parse(text);
  if (parsed.app !== "ruang-finance")
    throw Error("Choose a Ruang JSON backup.");
  return stateSchema.parse(parsed.data);
}
export async function pinHash(pin: string, salt: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salt + ":" + pin),
  );
  return [...new Uint8Array(bytes)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function readRawSavedData() {
  const db = await open();
  return new Promise<unknown>((resolve, reject) => {
    const r = db
      .transaction("records", "readonly")
      .objectStore("records")
      .get("current");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
