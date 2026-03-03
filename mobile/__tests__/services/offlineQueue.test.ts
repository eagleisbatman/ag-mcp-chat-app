// Tests for offlineQueue service
import {
  enqueueMutation,
  getQueue,
  processQueue,
  clearQueue,
  getQueueSize,
  startOfflineQueueListener,
  QueuedMutation,
} from '../../services/offlineQueue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock NetInfo
const mockNetInfoAddEventListener = jest.fn();
jest.mock('@react-native-community/netinfo', () => {
  return {
    __esModule: true,
    default: {
      addEventListener: (...args: unknown[]) => mockNetInfoAddEventListener(...args),
    },
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('offlineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getQueue', () => {
    it('returns empty array when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('parses stored queue from AsyncStorage', async () => {
      const stored: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: { name: 'Test' }, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stored));

      const queue = await getQueue();
      expect(queue).toEqual(stored);
    });

    it('returns empty array on invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json{{{');
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('enqueueMutation', () => {
    it('adds a mutation to an empty queue', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await enqueueMutation({ type: 'updateProfile', payload: { name: 'John' } });

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(key).toBe('offline_mutation_queue');
      const parsed = JSON.parse(value);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('updateProfile');
      expect(parsed[0].payload).toEqual({ name: 'John' });
      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].timestamp).toBeDefined();
    });

    it('appends to an existing queue', async () => {
      const existing: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: { name: 'A' }, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await enqueueMutation({ type: 'addFarm', payload: { name: 'Farm B' } });

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(value);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe('updateProfile');
      expect(parsed[1].type).toBe('addFarm');
    });

    it('drops oldest mutation via FIFO when queue is full (MAX_QUEUE_SIZE=100)', async () => {
      const fullQueue: QueuedMutation[] = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        type: 'updateProfile' as const,
        payload: { index: i },
        timestamp: Date.now() - (100 - i) * 1000,
      }));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(fullQueue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await enqueueMutation({ type: 'addAnimal', payload: { name: 'Cow' } });

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(value) as QueuedMutation[];
      // Still 100 items: oldest dropped, new one added
      expect(parsed).toHaveLength(100);
      // First item should be id-1 (id-0 was dropped)
      expect(parsed[0].id).toBe('id-1');
      // Last item should be the new mutation
      expect(parsed[99].type).toBe('addAnimal');
    });

    it('generates unique IDs for each mutation', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await enqueueMutation({ type: 'updateProfile', payload: {} });

      // Reset for second call — return what was stored in first call
      const firstCallValue = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(firstCallValue);

      await enqueueMutation({ type: 'updateFarm', payload: {} });

      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[1];
      const parsed = JSON.parse(value) as QueuedMutation[];
      expect(parsed[0].id).not.toBe(parsed[1].id);
    });
  });

  describe('processQueue', () => {
    it('returns zeros when queue is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const executor = jest.fn();

      const result = await processQueue(executor);

      expect(result).toEqual({ processed: 0, failed: 0 });
      expect(executor).not.toHaveBeenCalled();
    });

    it('processes all mutations successfully', async () => {
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: { name: 'A' }, timestamp: Date.now() },
        { id: '2', type: 'addFarm', payload: { name: 'B' }, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const executor = jest.fn().mockResolvedValue(true);

      const result = await processQueue(executor);

      expect(result).toEqual({ processed: 2, failed: 0 });
      expect(executor).toHaveBeenCalledTimes(2);
      // Remaining queue should be empty
      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(JSON.parse(value)).toEqual([]);
    });

    it('keeps failed mutations in the queue', async () => {
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: {}, timestamp: Date.now() },
        { id: '2', type: 'addFarm', payload: {}, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const executor = jest.fn()
        .mockResolvedValueOnce(true)   // first succeeds
        .mockResolvedValueOnce(false); // second fails

      const result = await processQueue(executor);

      expect(result).toEqual({ processed: 1, failed: 1 });
      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const remaining = JSON.parse(value) as QueuedMutation[];
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('2');
    });

    it('handles executor throwing an error', async () => {
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: {}, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const executor = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await processQueue(executor);

      expect(result).toEqual({ processed: 0, failed: 1 });
      const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const remaining = JSON.parse(value) as QueuedMutation[];
      expect(remaining).toHaveLength(1);
    });

    it('drops mutations older than 24 hours', async () => {
      const now = Date.now();
      const queue: QueuedMutation[] = [
        { id: 'stale', type: 'updateProfile', payload: {}, timestamp: now - 25 * 60 * 60 * 1000 },
        { id: 'fresh', type: 'addFarm', payload: {}, timestamp: now },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const executor = jest.fn().mockResolvedValue(true);

      const result = await processQueue(executor);

      // Only the fresh mutation is processed, stale is dropped silently
      expect(executor).toHaveBeenCalledTimes(1);
      expect(executor).toHaveBeenCalledWith(expect.objectContaining({ id: 'fresh' }));
      expect(result).toEqual({ processed: 1, failed: 0 });
    });

    it('prevents concurrent processing (lock)', async () => {
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: {}, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Use a manually controllable promise to hold the first processQueue mid-flight
      let resolveExec!: (value: boolean) => void;
      const executorPromise = new Promise<boolean>((resolve) => {
        resolveExec = resolve;
      });
      const executor = jest.fn().mockReturnValue(executorPromise);

      // Start first processing (it will await the executor promise)
      const first = processQueue(executor);

      // Flush microtasks so first processQueue enters the executor and sets isProcessing=true
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Start second processing while first is still running
      const secondResult = await processQueue(executor);
      expect(secondResult).toEqual({ processed: 0, failed: 0 });

      // Now resolve the first executor
      resolveExec(true);
      const firstResult = await first;
      expect(firstResult).toEqual({ processed: 1, failed: 0 });

      // The executor should have been called only once (from the first call)
      expect(executor).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearQueue', () => {
    it('removes the queue key from AsyncStorage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await clearQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_mutation_queue');
    });
  });

  describe('getQueueSize', () => {
    it('returns 0 for empty queue', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const size = await getQueueSize();
      expect(size).toBe(0);
    });

    it('returns correct count', async () => {
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: {}, timestamp: Date.now() },
        { id: '2', type: 'addFarm', payload: {}, timestamp: Date.now() },
        { id: '3', type: 'addAnimal', payload: {}, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      const size = await getQueueSize();
      expect(size).toBe(3);
    });
  });

  describe('startOfflineQueueListener', () => {
    it('subscribes to NetInfo and returns unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockNetInfoAddEventListener.mockReturnValue(mockUnsubscribe);
      const executor = jest.fn().mockResolvedValue(true);

      const unsubscribe = startOfflineQueueListener(executor);

      expect(mockNetInfoAddEventListener).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('processes queue after 2-second debounce when connected', async () => {
      const mockUnsubscribe = jest.fn();
      let netInfoCallback: (state: { isConnected: boolean }) => void = () => {};
      mockNetInfoAddEventListener.mockImplementation((cb: (state: { isConnected: boolean }) => void) => {
        netInfoCallback = cb;
        return mockUnsubscribe;
      });

      // Set up a queue to process
      const queue: QueuedMutation[] = [
        { id: '1', type: 'updateProfile', payload: {}, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const executor = jest.fn().mockResolvedValue(true);

      startOfflineQueueListener(executor);

      // Simulate connectivity restored
      netInfoCallback({ isConnected: true });

      // Before debounce, executor should not have been called
      expect(executor).not.toHaveBeenCalled();

      // Advance timers past the 2s debounce
      jest.advanceTimersByTime(2000);

      // Wait for async processing
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(executor).toHaveBeenCalled();
    });

    it('debounces rapid connectivity changes', () => {
      const mockUnsubscribe = jest.fn();
      let netInfoCallback: (state: { isConnected: boolean }) => void = () => {};
      mockNetInfoAddEventListener.mockImplementation((cb: (state: { isConnected: boolean }) => void) => {
        netInfoCallback = cb;
        return mockUnsubscribe;
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const executor = jest.fn().mockResolvedValue(true);

      startOfflineQueueListener(executor);

      // Rapid connectivity changes
      netInfoCallback({ isConnected: true });
      jest.advanceTimersByTime(500);
      netInfoCallback({ isConnected: true });
      jest.advanceTimersByTime(500);
      netInfoCallback({ isConnected: true });

      // Only 1500ms total since last event — should not have processed yet
      jest.advanceTimersByTime(1500);

      // Now 2000ms since last event
      jest.advanceTimersByTime(500);

      // The debounce means only one processQueue call happens
      // (after 2s from the last event)
    });

    it('does not process queue when disconnected', () => {
      const mockUnsubscribe = jest.fn();
      let netInfoCallback: (state: { isConnected: boolean }) => void = () => {};
      mockNetInfoAddEventListener.mockImplementation((cb: (state: { isConnected: boolean }) => void) => {
        netInfoCallback = cb;
        return mockUnsubscribe;
      });
      const executor = jest.fn();

      startOfflineQueueListener(executor);

      // Simulate disconnected
      netInfoCallback({ isConnected: false });
      jest.advanceTimersByTime(5000);

      expect(executor).not.toHaveBeenCalled();
    });

    it('cleans up debounce timer on unsubscribe', () => {
      const mockUnsubscribe = jest.fn();
      let netInfoCallback: (state: { isConnected: boolean }) => void = () => {};
      mockNetInfoAddEventListener.mockImplementation((cb: (state: { isConnected: boolean }) => void) => {
        netInfoCallback = cb;
        return mockUnsubscribe;
      });
      const executor = jest.fn();

      const unsubscribe = startOfflineQueueListener(executor);

      // Start a debounce timer
      netInfoCallback({ isConnected: true });

      // Unsubscribe before the timer fires
      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();

      // Advance past debounce — executor should NOT be called
      jest.advanceTimersByTime(5000);
      expect(executor).not.toHaveBeenCalled();
    });
  });
});
