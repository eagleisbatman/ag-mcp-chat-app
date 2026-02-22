/**
 * ProfileContext
 * Manages user profile, farms, and livestock with AsyncStorage-first + background API sync.
 * Follows LocationContext pattern.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProfile as fetchProfile,
  updateProfile as apiUpdateProfile,
  getFarms as apiFetchFarms,
  createFarm as apiCreateFarm,
  updateFarm as apiUpdateFarm,
  deleteFarm as apiDeleteFarm,
  getAnimals as apiFetchAnimals,
  createAnimal as apiCreateAnimal,
  updateAnimal as apiUpdateAnimal,
  deleteAnimal as apiDeleteAnimal,
  recordAnimalEvent as apiRecordEvent,
  createPlot as apiCreatePlot,
  allocateCrop as apiAllocateCrop,
  getMasterCrops,
  getMasterLivestock,
} from '../../services/db';
import {
  UserProfile,
  Farm,
  Plot,
  CropAllocation,
  Animal,
  AnimalEvent,
  AnimalEventType,
  MasterCrop,
  MasterLivestock,
  UserRole,
  FarmingType,
} from '../../types';
import { log } from '../../utils/logger';

/** Build user-scoped storage keys to prevent data leakage across onboarding resets. */
function storageKeys(uid: string | null) {
  const prefix = uid ? `${uid}:` : '';
  return {
    PROFILE: `${prefix}userProfile`,
    FARMS: `${prefix}userFarms`,
    ANIMALS: `${prefix}userAnimals`,
    MASTER_CROPS: 'masterCrops',       // master data is global, not user-scoped
    MASTER_LIVESTOCK: 'masterLivestock',
  };
}

interface ProfileContextValue {
  // Profile
  profile: UserProfile | null;
  isLoadingProfile: boolean;
  updateProfile: (fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'gender' | 'profilePictureUrl' | 'role' | 'farmingTypes'>>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;

  // Farms
  farms: Farm[];
  addFarm: (farm: { name: string; latitude?: number; longitude?: number; totalAreaHectares?: number }) => Promise<Farm | null>;
  updateFarm: (farmId: string, fields: Partial<Pick<Farm, 'name' | 'latitude' | 'longitude' | 'totalAreaHectares'>>) => Promise<boolean>;
  deleteFarm: (farmId: string) => Promise<boolean>;
  refreshFarms: () => Promise<void>;

  // Animals
  animals: Animal[];
  addAnimal: (animal: {
    livestockId: string; name?: string; trackingMode?: string;
    herdSize?: number; breed?: string; gender?: string;
  }) => Promise<Animal | null>;
  updateAnimal: (animalId: string, fields: Partial<Pick<Animal, 'name' | 'breed' | 'weightKg' | 'lactationStatus' | 'status'>>) => Promise<boolean>;
  deleteAnimal: (animalId: string) => Promise<boolean>;
  addEvent: (animalId: string, event: { eventType: AnimalEventType; eventDate?: string; eventData?: Record<string, unknown>; notes?: string }) => Promise<AnimalEvent | null>;
  refreshAnimals: () => Promise<void>;

  // Convenience: add a crop to the user's default farm/plot (creates farm + plot if needed)
  addCropToDefaultPlot: (cropId: string) => Promise<boolean>;

  // Master data
  masterCrops: MasterCrop[];
  masterLivestock: MasterLivestock[];

  // Derived
  profileSummary: string;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({
  children,
  userId,
  languageCode,
}: {
  children: ReactNode;
  userId: string | null;
  languageCode?: string;
}) => {
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [masterCrops, setMasterCrops] = useState<MasterCrop[]>([]);
  const [masterLivestock, setMasterLivestock] = useState<MasterLivestock[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Ref to current farms for use in callbacks (avoids stale closure)
  const farmsRef = useRef(farms);
  // Mutex to prevent concurrent addCropToDefaultPlot calls creating duplicate farms
  const cropToDefaultMutex = useRef(false);

  // Keep farmsRef in sync with farms state
  useEffect(() => { farmsRef.current = farms; }, [farms]);

  // Load from AsyncStorage when userId is known (user-scoped keys prevent data leakage)
  useEffect(() => {
    const loadCached = async () => {
      try {
        const keys = storageKeys(userId);
        const [cachedProfile, cachedFarms, cachedAnimals, cachedCrops, cachedLivestock] = await Promise.all([
          userId ? AsyncStorage.getItem(keys.PROFILE) : Promise.resolve(null),
          userId ? AsyncStorage.getItem(keys.FARMS) : Promise.resolve(null),
          userId ? AsyncStorage.getItem(keys.ANIMALS) : Promise.resolve(null),
          AsyncStorage.getItem(keys.MASTER_CROPS),
          AsyncStorage.getItem(keys.MASTER_LIVESTOCK),
        ]);

        if (cachedProfile) setProfile(JSON.parse(cachedProfile));
        if (cachedFarms) setFarms(JSON.parse(cachedFarms));
        if (cachedAnimals) setAnimals(JSON.parse(cachedAnimals));
        if (cachedCrops) setMasterCrops(JSON.parse(cachedCrops));
        if (cachedLivestock) setMasterLivestock(JSON.parse(cachedLivestock));
      } catch (e) {
        log('Error loading cached profile data:', e);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadCached();
  }, [userId]);

  // Background sync when userId is available
  useEffect(() => {
    if (!userId) return;

    const keys = storageKeys(userId);
    const syncFromApi = async () => {
      try {
        const [profileResult, farmsResult, animalsResult] = await Promise.all([
          fetchProfile(),
          apiFetchFarms(),
          apiFetchAnimals(),
        ]);

        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
          await AsyncStorage.setItem(keys.PROFILE, JSON.stringify(profileResult.data));
        }
        if (farmsResult.success && farmsResult.data) {
          setFarms(farmsResult.data);
          await AsyncStorage.setItem(keys.FARMS, JSON.stringify(farmsResult.data));
        }
        if (animalsResult.success && animalsResult.data) {
          setAnimals(animalsResult.data);
          await AsyncStorage.setItem(keys.ANIMALS, JSON.stringify(animalsResult.data));
        }
      } catch (e) {
        log('Error syncing profile from API:', e);
      }
    };
    syncFromApi();
  }, [userId]);

  // Load master data (once)
  useEffect(() => {
    if (!userId) return;

    const loadMasterData = async () => {
      try {
        const [cropsResult, livestockResult] = await Promise.all([
          getMasterCrops({ lang: languageCode }),
          getMasterLivestock({ lang: languageCode }),
        ]);

        if (cropsResult.success && cropsResult.data) {
          setMasterCrops(cropsResult.data);
          await AsyncStorage.setItem(storageKeys(userIdRef.current).MASTER_CROPS, JSON.stringify(cropsResult.data));
        }
        if (livestockResult.success && livestockResult.data) {
          setMasterLivestock(livestockResult.data);
          await AsyncStorage.setItem(storageKeys(userIdRef.current).MASTER_LIVESTOCK, JSON.stringify(livestockResult.data));
        }
      } catch (e) {
        log('Error loading master data:', e);
      }
    };
    loadMasterData();
  }, [userId, languageCode]);

  // ── Profile ──────────────────────────────────────
  const updateProfile = useCallback(async (
    fields: Partial<Pick<UserProfile, 'name' | 'phone' | 'gender' | 'profilePictureUrl' | 'role' | 'farmingTypes'>>
  ): Promise<boolean> => {
    const result = await apiUpdateProfile(fields);
    if (result.success && result.data) {
      setProfile((prev) => {
        const updated = { ...prev, ...result.data } as UserProfile;
        AsyncStorage.setItem(storageKeys(userIdRef.current).PROFILE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return true;
    }
    return false;
  }, []);

  const refreshProfile = useCallback(async () => {
    const result = await fetchProfile();
    if (result.success && result.data) {
      setProfile(result.data);
      await AsyncStorage.setItem(storageKeys(userIdRef.current).PROFILE, JSON.stringify(result.data));
    }
  }, []);

  // ── Farms ────────────────────────────────────────
  const addFarm = useCallback(async (
    farm: { name: string; latitude?: number; longitude?: number; totalAreaHectares?: number }
  ): Promise<Farm | null> => {
    const result = await apiCreateFarm(farm);
    if (result.success && result.data) {
      setFarms((prev) => {
        const updated = [result.data!, ...prev];
        AsyncStorage.setItem(storageKeys(userIdRef.current).FARMS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return result.data;
    }
    return null;
  }, []);

  const updateFarmCb = useCallback(async (
    farmId: string,
    fields: Partial<Pick<Farm, 'name' | 'latitude' | 'longitude' | 'totalAreaHectares'>>
  ): Promise<boolean> => {
    const result = await apiUpdateFarm(farmId, fields);
    if (result.success && result.data) {
      setFarms((prev) => {
        const updated = prev.map(f => f.id === farmId ? result.data! : f);
        AsyncStorage.setItem(storageKeys(userIdRef.current).FARMS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return true;
    }
    return false;
  }, []);

  const deleteFarmCb = useCallback(async (farmId: string): Promise<boolean> => {
    const result = await apiDeleteFarm(farmId);
    if (result.success) {
      setFarms((prev) => {
        const updated = prev.filter(f => f.id !== farmId);
        AsyncStorage.setItem(storageKeys(userIdRef.current).FARMS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return true;
    }
    return false;
  }, []);

  const refreshFarms = useCallback(async () => {
    const result = await apiFetchFarms();
    if (result.success && result.data) {
      setFarms(result.data);
      await AsyncStorage.setItem(storageKeys(userIdRef.current).FARMS, JSON.stringify(result.data));
    }
  }, []);

  /**
   * Add a crop to the user's default farm/plot. Creates farm + plot if needed.
   * Uses a mutex to prevent concurrent calls from creating duplicate farms.
   * Reads farmsRef (not stale closure) for latest state.
   */
  const addCropToDefaultPlot = useCallback(async (cropId: string): Promise<boolean> => {
    // Mutex: prevent concurrent calls from racing to create duplicate farms
    if (cropToDefaultMutex.current) {
      log('addCropToDefaultPlot: skipped (another call in progress)');
      return false;
    }
    cropToDefaultMutex.current = true;

    try {
      // Read latest farms from ref (not stale closure)
      const currentFarms = farmsRef.current;

      // 1. Get or create default farm
      let farm = currentFarms[0];
      if (!farm) {
        const farmResult = await apiCreateFarm({ name: 'My Farm' });
        if (!farmResult.success || !farmResult.data) {
          log('addCropToDefaultPlot: failed to create farm');
          return false;
        }
        farm = farmResult.data;
        setFarms((prev) => {
          const updated = [farm!, ...prev];
          AsyncStorage.setItem(storageKeys(userIdRef.current).FARMS, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      }

      // 2. Get first plot or create default
      let plotId = farm.plots?.[0]?.id;
      if (!plotId) {
        const plotResult = await apiCreatePlot(farm.id, { name: 'Main Plot' });
        if (!plotResult.success || !plotResult.data) {
          log('addCropToDefaultPlot: failed to create plot');
          return false;
        }
        plotId = plotResult.data.id;
      }

      // 3. Check for existing allocation of same crop (prevent duplicates)
      const existingAlloc = farm.plots
        ?.flatMap(p => p.cropAllocations || [])
        ?.find(a => a.cropId === cropId);
      if (existingAlloc) {
        log('addCropToDefaultPlot: crop already allocated, skipping');
        return true; // Already exists — success without duplicate
      }

      // 4. Add crop allocation
      const allocResult = await apiAllocateCrop(plotId, { cropId, status: 'planted' });
      if (!allocResult.success) {
        log('addCropToDefaultPlot: failed to allocate crop');
        return false;
      }

      // 5. Refresh to pick up changes for next AI call
      await refreshFarms();
      return true;
    } catch (err) {
      log('addCropToDefaultPlot error:', err);
      return false;
    } finally {
      cropToDefaultMutex.current = false;
    }
  }, [refreshFarms]);

  // ── Animals ──────────────────────────────────────
  const addAnimal = useCallback(async (
    animal: { livestockId: string; name?: string; trackingMode?: string; herdSize?: number; breed?: string; gender?: string }
  ): Promise<Animal | null> => {
    const result = await apiCreateAnimal(animal);
    if (result.success && result.data) {
      setAnimals((prev) => {
        const updated = [result.data!, ...prev];
        AsyncStorage.setItem(storageKeys(userIdRef.current).ANIMALS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return result.data;
    }
    return null;
  }, []);

  const updateAnimalCb = useCallback(async (
    animalId: string,
    fields: Partial<Pick<Animal, 'name' | 'breed' | 'weightKg' | 'lactationStatus' | 'status'>>
  ): Promise<boolean> => {
    const result = await apiUpdateAnimal(animalId, fields);
    if (result.success && result.data) {
      setAnimals((prev) => {
        const updated = prev.map(a => a.id === animalId ? result.data! : a);
        AsyncStorage.setItem(storageKeys(userIdRef.current).ANIMALS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return true;
    }
    return false;
  }, []);

  const deleteAnimalCb = useCallback(async (animalId: string): Promise<boolean> => {
    const result = await apiDeleteAnimal(animalId);
    if (result.success) {
      setAnimals((prev) => {
        const updated = prev.filter(a => a.id !== animalId);
        AsyncStorage.setItem(storageKeys(userIdRef.current).ANIMALS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return true;
    }
    return false;
  }, []);

  const addEvent = useCallback(async (
    animalId: string,
    event: { eventType: AnimalEventType; eventDate?: string; eventData?: Record<string, unknown>; notes?: string }
  ): Promise<AnimalEvent | null> => {
    const result = await apiRecordEvent(animalId, event);
    if (result.success && result.data) {
      // Refresh animals to get updated status (death/sale auto-update)
      const animalsResult = await apiFetchAnimals();
      if (animalsResult.success && animalsResult.data) {
        setAnimals(animalsResult.data);
        await AsyncStorage.setItem(storageKeys(userIdRef.current).ANIMALS, JSON.stringify(animalsResult.data));
      }
      return result.data;
    }
    return null;
  }, []);

  const refreshAnimals = useCallback(async () => {
    const result = await apiFetchAnimals();
    if (result.success && result.data) {
      setAnimals(result.data);
      await AsyncStorage.setItem(storageKeys(userIdRef.current).ANIMALS, JSON.stringify(result.data));
    }
  }, []);

  // ── Derived: profile summary for AI ──────────────
  const profileSummary = React.useMemo(() => {
    if (!profile) return '';

    const parts: string[] = [];

    if (profile.name) parts.push(profile.name);
    if (profile.role && profile.role !== 'farmer') parts.push(`(${profile.role})`);

    if (farms.length > 0) {
      const farmSummaries = farms.map(f => {
        const plotInfo = f.plots?.map(p => {
          const cropNames = p.cropAllocations?.map(c => c.cropName || 'Unknown').join(', ');
          return `${p.name}${cropNames ? ': ' + cropNames : ''}`;
        }).join('; ');
        return `${f.name}${plotInfo ? ' (' + plotInfo + ')' : ''}`;
      });
      parts.push(`Farms: ${farmSummaries.join(', ')}`);
    }

    if (animals.length > 0) {
      // Group by livestock type
      const byType: Record<string, number> = {};
      for (const a of animals) {
        const type = a.livestockName || 'Unknown';
        byType[type] = (byType[type] || 0) + (a.trackingMode === 'herd' ? (a.herdSize || 1) : 1);
      }
      const animalSummary = Object.entries(byType).map(([type, count]) => `${type} x${count}`).join(', ');
      parts.push(`Livestock: ${animalSummary}`);
    }

    return parts.join(' | ');
  }, [profile, farms, animals]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoadingProfile,
        updateProfile,
        refreshProfile,
        farms,
        addFarm,
        updateFarm: updateFarmCb,
        deleteFarm: deleteFarmCb,
        refreshFarms,
        addCropToDefaultPlot,
        animals,
        addAnimal,
        updateAnimal: updateAnimalCb,
        deleteAnimal: deleteAnimalCb,
        addEvent,
        refreshAnimals,
        masterCrops,
        masterLivestock,
        profileSummary,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
};
