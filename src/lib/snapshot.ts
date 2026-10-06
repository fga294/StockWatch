import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { DashboardData, Snapshot } from "./types";

const SNAPSHOT_FILE = path.join(process.cwd(), "data", "snapshot.json");

/**
 * Reads data/snapshot.json (written by `npm run fetch-data`).
 * Returns null if the file hasn't been generated yet.
 */
export const loadSnapshot = cache(async (): Promise<Snapshot | null> => {
  try {
    return JSON.parse(await readFile(SNAPSHOT_FILE, "utf8")) as Snapshot;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
});

/** Drops per-company price history so the page payload stays small. */
export function toDashboardData(snapshot: Snapshot): DashboardData {
  return {
    lastUpdated: snapshot.lastUpdated,
    source: snapshot.source,
    universe: snapshot.universe,
    skipped: snapshot.skipped,
    companies: snapshot.companies.map(({ history, ...summary }) => summary),
  };
}
