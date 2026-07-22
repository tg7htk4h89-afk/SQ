import { openDB, type IDBPDatabase } from 'idb';
import { api } from './api';

/**
 * Every change an inspector makes lands in IndexedDB first and is pushed to the
 * server second. Branches have thick walls and bad signal; the queue is what
 * makes that a non-event rather than lost work.
 */

export interface QueuedAnswer {
  key: string; // inspectionId::questionId — one row per question, latest wins
  inspectionId: string;
  questionId: string;
  ratingCode?: string | null;
  isNA?: boolean;
  textValue?: string | null;
  subValues?: Record<string, string> | null;
  comment?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  answeredAt: string;
}

export interface QueuedPhoto {
  id: string;
  inspectionId: string;
  answerId: string;
  blob: Blob;
  fileName: string;
  latitude?: number;
  longitude?: number;
  queuedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  dbPromise ??= openDB('bsq', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('answers', { keyPath: 'key' });
        database.createObjectStore('photos', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        database.createObjectStore('drafts', { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
}

// ------------------------------------------------------------------ answers

export async function queueAnswer(answer: Omit<QueuedAnswer, 'key' | 'answeredAt'>) {
  const record: QueuedAnswer = {
    ...answer,
    key: `${answer.inspectionId}::${answer.questionId}`,
    answeredAt: new Date().toISOString(),
  };
  await (await db()).put('answers', record);
  emitStatus();
  void flush();
  return record;
}

export async function pendingCount() {
  const database = await db();
  const [a, p] = await Promise.all([database.count('answers'), database.count('photos')]);
  return a + p;
}

// ------------------------------------------------------------------- photos

export async function queuePhoto(photo: Omit<QueuedPhoto, 'id' | 'queuedAt'>) {
  const record: QueuedPhoto = { ...photo, id: crypto.randomUUID(), queuedAt: new Date().toISOString() };
  await (await db()).put('photos', record);
  emitStatus();
  void flush();
  return record;
}

// -------------------------------------------------------------------- drafts

/** A full snapshot of an in-progress inspection so it renders offline. */
export async function saveDraft(id: string, data: unknown) {
  await (await db()).put('drafts', { id, data, savedAt: new Date().toISOString() });
}

export async function readDraft<T>(id: string): Promise<T | null> {
  const row = await (await db()).get('drafts', id);
  return (row?.data as T) ?? null;
}

// --------------------------------------------------------------------- sync

let flushing = false;

export async function flush(): Promise<{ pushed: number; failed: number }> {
  if (flushing || !navigator.onLine) return { pushed: 0, failed: 0 };
  flushing = true;
  let pushed = 0;
  let failed = 0;

  try {
    const database = await db();

    // Answers go up grouped by inspection so each inspection is one request.
    const answers = (await database.getAll('answers')) as QueuedAnswer[];
    const byInspection = new Map<string, QueuedAnswer[]>();
    for (const a of answers) {
      byInspection.set(a.inspectionId, [...(byInspection.get(a.inspectionId) ?? []), a]);
    }

    for (const [inspectionId, batch] of byInspection) {
      try {
        await api(`/inspections/${inspectionId}/answers`, {
          method: 'PUT',
          body: JSON.stringify({
            answers: batch.map(({ key, inspectionId: _i, ...rest }) => rest),
          }),
        });
        await Promise.all(batch.map((a) => database.delete('answers', a.key)));
        pushed += batch.length;
      } catch {
        failed += batch.length;
      }
    }

    const photos = (await database.getAll('photos')) as QueuedPhoto[];
    for (const photo of photos) {
      try {
        const form = new FormData();
        form.append('photos', photo.blob, photo.fileName);
        if (photo.latitude != null) form.append('latitude', String(photo.latitude));
        if (photo.longitude != null) form.append('longitude', String(photo.longitude));
        await api(`/uploads/answers/${photo.answerId}/photos`, { method: 'POST', body: form });
        await database.delete('photos', photo.id);
        pushed += 1;
      } catch {
        failed += 1;
      }
    }
  } finally {
    flushing = false;
    emitStatus();
  }

  return { pushed, failed };
}

export interface SyncStatus {
  online: boolean;
  pending: number;
}

function emitStatus() {
  void pendingCount().then((pending) => {
    window.dispatchEvent(
      new CustomEvent<SyncStatus>('bsq:sync', { detail: { online: navigator.onLine, pending } }),
    );
  });
}

export function startSyncLoop() {
  window.addEventListener('online', () => void flush());
  window.addEventListener('offline', emitStatus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
  setInterval(() => void flush(), 20_000);
  emitStatus();
}
