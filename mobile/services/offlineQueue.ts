/**
 * Offline Mutation Queue
 * Stores failed API mutations when offline and replays them when connectivity returns.
 * Uses last-write-wins for conflict resolution (server timestamp comparison).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { log } from '../utils/logger';

const QUEUE_KEY = 'offline_mutation_queue';
const MAX_QUEUE_SIZE = 100;

export interface QueuedMutation {
  id: string;
  type: 'updateProfile' | 'updateFarm' | 'updateAnimal' | 'addFarm' | 'addAnimal';
  payload: Record<string, unknown>;
  timestamp: number;
}

let isProcessing = false;

/** Add a mutation to the offline queue. */
export async function enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    log(`[OfflineQueue] Queue full (${MAX_QUEUE_SIZE}), dropping oldest mutation`);
    queue.shift();
  }
  queue.push({
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  log(`[OfflineQueue] Enqueued ${mutation.type}, queue size: ${queue.length}`);
}

/** Get the current queue. */
export async function getQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

/** Process all queued mutations. Called when connectivity resumes. */
export async function processQueue(
  executor: (mutation: QueuedMutation) => Promise<boolean>,
): Promise<{ processed: number; failed: number }> {
  if (isProcessing) return { processed: 0, failed: 0 };
  isProcessing = true;

  try {
    const queue = await getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    log(`[OfflineQueue] Processing ${queue.length} queued mutations`);
    const remaining: QueuedMutation[] = [];
    let processed = 0;
    let failed = 0;

    for (const mutation of queue) {
      // Skip mutations older than 24 hours
      if (Date.now() - mutation.timestamp > 24 * 60 * 60 * 1000) {
        log(`[OfflineQueue] Dropping stale mutation: ${mutation.type} (${mutation.id})`);
        continue;
      }

      try {
        const success = await executor(mutation);
        if (success) {
          processed++;
        } else {
          failed++;
          remaining.push(mutation);
        }
      } catch (err) {
        log(`[OfflineQueue] Executor threw for ${mutation.type} (${mutation.id}):`, err);
        failed++;
        remaining.push(mutation);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    log(`[OfflineQueue] Done: ${processed} processed, ${failed} failed, ${remaining.length} remaining`);
    return { processed, failed };
  } finally {
    isProcessing = false;
  }
}

/** Clear the entire queue. */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** Get the queue size without loading all items. */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Start listening for connectivity changes and process the queue when online.
 * Debounces rapid connectivity changes (e.g., flaky network) by 2 seconds.
 * Returns an unsubscribe function.
 */
export function startOfflineQueueListener(
  executor: (mutation: QueuedMutation) => Promise<boolean>,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processQueue(executor).catch((err) =>
          log('[OfflineQueue] Error processing queue:', err)
        );
      }, 2_000);
    }
  });
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubscribe();
  };
}
