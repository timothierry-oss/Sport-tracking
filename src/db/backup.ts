import { db, TABLES } from './db';

const FORMAT = 'suivi-sport';
const VERSION = 2;

export async function exportData(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Remplace toutes les données locales par le contenu du fichier. */
export async function importData(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.format !== FORMAT || typeof parsed.data !== 'object') {
    throw new Error("Ce fichier n'est pas une sauvegarde Suivi Sport.");
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = parsed.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}

export function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
