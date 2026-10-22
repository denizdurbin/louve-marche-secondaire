import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarketSnapshot } from '@louve/core';

/** Keeps the last good snapshot of each SCPI on disk, so the app survives a source outage or a restart. */
export interface SnapshotStore {
  load(scpiId: string): Promise<MarketSnapshot | null>;
  save(snapshot: MarketSnapshot): Promise<void>;
}

export function fileSnapshotStore(dir: string): SnapshotStore {
  const fileFor = (scpiId: string) => join(dir, `${scpiId}.json`);
  return {
    async load(scpiId) {
      try {
        return JSON.parse(await readFile(fileFor(scpiId), 'utf8')) as MarketSnapshot;
      } catch {
        return null;
      }
    },
    async save(snapshot) {
      await mkdir(dir, { recursive: true });
      await writeFile(fileFor(snapshot.scpiId), JSON.stringify(snapshot, null, 2));
    },
  };
}

export function memorySnapshotStore(): SnapshotStore {
  const snapshots = new Map<string, MarketSnapshot>();
  return {
    async load(scpiId) {
      return snapshots.get(scpiId) ?? null;
    },
    async save(snapshot) {
      snapshots.set(snapshot.scpiId, snapshot);
    },
  };
}
