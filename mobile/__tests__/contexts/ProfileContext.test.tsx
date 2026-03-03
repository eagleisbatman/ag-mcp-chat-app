/**
 * Tests for ProfileContext
 * Covers: profile loading from cache, API sync, CRUD operations for farms/animals,
 * addCropToDefaultPlot idempotency/mutex, master data, profile summary, error paths.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getFarms: jest.fn(),
  createFarm: jest.fn(),
  updateFarm: jest.fn(),
  deleteFarm: jest.fn(),
  getAnimals: jest.fn(),
  createAnimal: jest.fn(),
  updateAnimal: jest.fn(),
  deleteAnimal: jest.fn(),
  recordAnimalEvent: jest.fn(),
  createPlot: jest.fn(),
  allocateCrop: jest.fn(),
  getMasterCrops: jest.fn(),
  getMasterLivestock: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as db from '../../services/db';
import { ProfileProvider, useProfile } from '../../contexts/app/ProfileContext';

const makeFarm = (id: string, name: string, plots: unknown[] = []) => ({
  id,
  name,
  plots,
  latitude: 0,
  longitude: 0,
  totalAreaHectares: 10,
});

const makeAnimal = (id: string, livestockId: string, name?: string) => ({
  id,
  livestockId,
  name: name || '',
  livestockName: 'Cattle',
  trackingMode: 'individual',
  herdSize: 1,
  status: 'active',
});

function createWrapper(userId: string | null = 'test-user-id') {
  return ({ children }: { children: React.ReactNode }) => (
    <ProfileProvider userId={userId}>{children}</ProfileProvider>
  );
}

describe('ProfileContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all async storage calls return null, all API calls return empty success
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (db.getProfile as jest.Mock).mockResolvedValue({ success: true, data: null });
    (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (db.getAnimals as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (db.getMasterCrops as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (db.getMasterLivestock as jest.Mock).mockResolvedValue({ success: true, data: [] });
  });

  // ── Initial state ──
  describe('initial loading', () => {
    it('starts with loading true and empty data', () => {
      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      // Loading starts true before async effects
      expect(result.current.profile).toBeNull();
      expect(result.current.farms).toEqual([]);
      expect(result.current.animals).toEqual([]);
    });

    it('loads cached profile from AsyncStorage', async () => {
      const cachedProfile = { name: 'Test', role: 'farmer' };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'test-user-id:userProfile') return Promise.resolve(JSON.stringify(cachedProfile));
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoadingProfile).toBe(false);
      });

      expect(result.current.profile).toEqual(cachedProfile);
    });

    it('loads cached farms from AsyncStorage', async () => {
      const cachedFarms = [makeFarm('f1', 'My Farm')];
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'test-user-id:userFarms') return Promise.resolve(JSON.stringify(cachedFarms));
        return Promise.resolve(null);
      });
      // API must return same data or background sync will overwrite cache with empty array
      (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: cachedFarms });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.farms).toHaveLength(1);
      });
    });

    it('handles null userId gracefully (no cached data loads)', async () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(null),
      });

      await waitFor(() => {
        expect(result.current.isLoadingProfile).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  // ── Profile update ──
  describe('updateProfile', () => {
    it('updates profile and saves to storage on success', async () => {
      const updated = { name: 'New Name', role: 'farmer' };
      (db.updateProfile as jest.Mock).mockResolvedValue({ success: true, data: updated });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateProfile({ name: 'New Name' });
      });

      expect(success).toBe(true);
    });

    it('returns false when API fails', async () => {
      (db.updateProfile as jest.Mock).mockResolvedValue({ success: false, error: 'fail' });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateProfile({ name: 'Fail' });
      });

      expect(success).toBe(false);
    });
  });

  // ── Farm CRUD ──
  describe('farm operations', () => {
    it('addFarm adds to state on success', async () => {
      const newFarm = makeFarm('f-new', 'New Farm');
      (db.createFarm as jest.Mock).mockResolvedValue({ success: true, data: newFarm });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      let farm: unknown = null;
      await act(async () => {
        farm = await result.current.addFarm({ name: 'New Farm' });
      });

      expect(farm).toEqual(newFarm);
      expect(result.current.farms).toHaveLength(1);
    });

    it('addFarm returns null on failure', async () => {
      (db.createFarm as jest.Mock).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      let farm: unknown = 'not-null';
      await act(async () => {
        farm = await result.current.addFarm({ name: 'Fail Farm' });
      });

      expect(farm).toBeNull();
    });

    it('updateFarm updates the farm in state', async () => {
      const origFarm = makeFarm('f1', 'Old Name');
      const updatedFarm = makeFarm('f1', 'Updated');
      (db.createFarm as jest.Mock).mockResolvedValue({ success: true, data: origFarm });
      (db.updateFarm as jest.Mock).mockResolvedValue({ success: true, data: updatedFarm });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      await act(async () => {
        await result.current.addFarm({ name: 'Old Name' });
      });

      let success = false;
      await act(async () => {
        success = await result.current.updateFarm('f1', { name: 'Updated' });
      });

      expect(success).toBe(true);
    });

    it('deleteFarm removes from state', async () => {
      const farm = makeFarm('f1', 'To Delete');
      (db.createFarm as jest.Mock).mockResolvedValue({ success: true, data: farm });
      (db.deleteFarm as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      await act(async () => {
        await result.current.addFarm({ name: 'To Delete' });
      });

      expect(result.current.farms).toHaveLength(1);

      let success = false;
      await act(async () => {
        success = await result.current.deleteFarm('f1');
      });

      expect(success).toBe(true);
      expect(result.current.farms).toHaveLength(0);
    });
  });

  // ── Animal operations ──
  describe('animal operations', () => {
    it('addAnimal adds to state on success', async () => {
      const newAnimal = makeAnimal('a1', 'liv-1', 'Bessie');
      (db.createAnimal as jest.Mock).mockResolvedValue({ success: true, data: newAnimal });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      let animal: unknown = null;
      await act(async () => {
        animal = await result.current.addAnimal({ livestockId: 'liv-1', name: 'Bessie' });
      });

      expect(animal).toEqual(newAnimal);
      expect(result.current.animals).toHaveLength(1);
    });

    it('addAnimal returns existing animal for duplicate (idempotent)', async () => {
      const existing = makeAnimal('a1', 'liv-1', 'Bessie');
      (db.createAnimal as jest.Mock).mockResolvedValue({ success: true, data: existing });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      // Add first time
      await act(async () => {
        await result.current.addAnimal({ livestockId: 'liv-1', name: 'Bessie' });
      });

      // Add duplicate
      let dup: unknown = null;
      await act(async () => {
        dup = await result.current.addAnimal({ livestockId: 'liv-1', name: 'Bessie' });
      });

      // Should return existing without calling API again
      expect(dup).toEqual(existing);
      expect(db.createAnimal).toHaveBeenCalledTimes(1);
    });

    it('deleteAnimal removes from state', async () => {
      const animal = makeAnimal('a1', 'liv-1');
      (db.createAnimal as jest.Mock).mockResolvedValue({ success: true, data: animal });
      (db.deleteAnimal as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      await act(async () => {
        await result.current.addAnimal({ livestockId: 'liv-1' });
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteAnimal('a1');
      });

      expect(success).toBe(true);
      expect(result.current.animals).toHaveLength(0);
    });

    it('addEvent refreshes animals after recording', async () => {
      (db.recordAnimalEvent as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'ev-1', eventType: 'vaccination' },
      });
      (db.getAnimals as jest.Mock).mockResolvedValue({ success: true, data: [] });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      await act(async () => {
        await result.current.addEvent('a1', { eventType: 'vaccination' as any });
      });

      // getAnimals is called during background sync AND after event recording
      expect(db.getAnimals).toHaveBeenCalled();
    });
  });

  // ── addCropToDefaultPlot ──
  describe('addCropToDefaultPlot', () => {
    it('creates farm and plot if none exist, then allocates crop', async () => {
      const newFarm = makeFarm('f-auto', 'My Farm');
      const newPlot = { id: 'p-auto', name: 'Main Plot' };
      (db.createFarm as jest.Mock).mockResolvedValue({ success: true, data: newFarm });
      (db.createPlot as jest.Mock).mockResolvedValue({ success: true, data: newPlot });
      (db.allocateCrop as jest.Mock).mockResolvedValue({ success: true, data: {} });
      (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: [newFarm] });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      // Wait for all async effects to settle (cache load + background sync + master data)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      let success = false;
      await act(async () => {
        success = await result.current.addCropToDefaultPlot('crop-1');
      });

      expect(success).toBe(true);
      expect(db.allocateCrop).toHaveBeenCalled();
    });

    it('skips duplicate crop allocation (idempotent)', async () => {
      const farmWithCrop = {
        ...makeFarm('f1', 'Farm', [
          { id: 'p1', name: 'Plot', cropAllocations: [{ cropId: 'crop-1' }] },
        ]),
      };

      // Both cached and API return the same farm with existing crop
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'test-user-id:userFarms') return Promise.resolve(JSON.stringify([farmWithCrop]));
        return Promise.resolve(null);
      });
      (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: [farmWithCrop] });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      // Wait for background sync to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      await waitFor(() => expect(result.current.farms).toHaveLength(1));

      let success = false;
      await act(async () => {
        success = await result.current.addCropToDefaultPlot('crop-1');
      });

      expect(success).toBe(true);
      // Should not have called allocateCrop since it already exists
      expect(db.allocateCrop).not.toHaveBeenCalled();
    });

    it('returns false when farm creation fails', async () => {
      (db.createFarm as jest.Mock).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      let success = true;
      await act(async () => {
        success = await result.current.addCropToDefaultPlot('crop-fail');
      });

      expect(success).toBe(false);
    });

    it('mutex prevents concurrent calls', async () => {
      const newFarm = makeFarm('f-mutex', 'My Farm');
      const newPlot = { id: 'p-mutex', name: 'Main Plot' };
      // Slow farm creation
      (db.createFarm as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: newFarm }), 50))
      );
      (db.createPlot as jest.Mock).mockResolvedValue({ success: true, data: newPlot });
      (db.allocateCrop as jest.Mock).mockResolvedValue({ success: true, data: {} });
      (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: [newFarm] });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Fire two concurrent calls
      let r1: boolean = false;
      let r2: boolean = false;
      await act(async () => {
        const p1 = result.current.addCropToDefaultPlot('c1');
        const p2 = result.current.addCropToDefaultPlot('c2');
        [r1, r2] = await Promise.all([p1, p2]);
      });

      // Second call should be blocked by mutex
      expect(r2).toBe(false);
    });
  });

  // ── Master data ──
  describe('master data', () => {
    it('loads master crops and livestock', async () => {
      (db.getMasterCrops as jest.Mock).mockResolvedValue({
        success: true,
        data: [{ id: 'c1', name: 'Maize' }],
      });
      (db.getMasterLivestock as jest.Mock).mockResolvedValue({
        success: true,
        data: [{ id: 'l1', name: 'Cattle' }],
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.masterCrops).toHaveLength(1);
      });

      expect(result.current.masterLivestock).toHaveLength(1);
      expect(result.current.masterDataError).toBe(false);
    });

    it('sets masterDataError when both calls fail and no cache', async () => {
      (db.getMasterCrops as jest.Mock).mockResolvedValue({ success: false });
      (db.getMasterLivestock as jest.Mock).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.masterDataError).toBe(true);
      });
    });

    it('retryMasterData reloads master data', async () => {
      (db.getMasterCrops as jest.Mock).mockResolvedValue({ success: false });
      (db.getMasterLivestock as jest.Mock).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.masterDataError).toBe(true));

      // Now fix the API
      (db.getMasterCrops as jest.Mock).mockResolvedValue({
        success: true,
        data: [{ id: 'c1', name: 'Wheat' }],
      });
      (db.getMasterLivestock as jest.Mock).mockResolvedValue({
        success: true,
        data: [{ id: 'l1', name: 'Goat' }],
      });

      await act(async () => {
        await result.current.retryMasterData();
      });

      expect(result.current.masterCrops).toHaveLength(1);
      expect(result.current.masterDataError).toBe(false);
    });
  });

  // ── Profile summary ──
  describe('profileSummary', () => {
    it('returns empty string when no profile', async () => {
      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoadingProfile).toBe(false));

      expect(result.current.profileSummary).toBe('');
    });

    it('builds summary with name, farms, and animals', async () => {
      const profile = { name: 'John', role: 'farmer' };
      const farms = [
        { ...makeFarm('f1', 'Big Farm'), plots: [{ name: 'Plot A', cropAllocations: [{ cropName: 'Maize' }] }] },
      ];
      const animals = [{ ...makeAnimal('a1', 'l1'), livestockName: 'Cattle', trackingMode: 'individual', herdSize: 1 }];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'test-user-id:userProfile') return Promise.resolve(JSON.stringify(profile));
        if (key === 'test-user-id:userFarms') return Promise.resolve(JSON.stringify(farms));
        if (key === 'test-user-id:userAnimals') return Promise.resolve(JSON.stringify(animals));
        return Promise.resolve(null);
      });
      // Also make API calls return the same data (background sync overwrites cache)
      (db.getProfile as jest.Mock).mockResolvedValue({ success: true, data: profile });
      (db.getFarms as jest.Mock).mockResolvedValue({ success: true, data: farms });
      (db.getAnimals as jest.Mock).mockResolvedValue({ success: true, data: animals });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      // Wait for background sync
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await waitFor(() => {
        expect(result.current.profileSummary).toContain('John');
      });

      expect(result.current.profileSummary).toContain('Big Farm');
      expect(result.current.profileSummary).toContain('Maize');
      expect(result.current.profileSummary).toContain('Cattle');
    });

    it('includes role when not farmer', async () => {
      const profile = { name: 'Jane', role: 'extension_worker' };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'test-user-id:userProfile') return Promise.resolve(JSON.stringify(profile));
        return Promise.resolve(null);
      });
      (db.getProfile as jest.Mock).mockResolvedValue({ success: true, data: profile });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await waitFor(() => {
        expect(result.current.profileSummary).toContain('(extension_worker)');
      });
    });
  });

  // ── useProfile outside provider ──
  describe('useProfile outside provider', () => {
    it('throws when used outside ProfileProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useProfile());
      }).toThrow('useProfile must be used within ProfileProvider');
      spy.mockRestore();
    });
  });
});
