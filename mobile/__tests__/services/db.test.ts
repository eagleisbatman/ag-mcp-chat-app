/**
 * Tests for services/db.ts
 * Covers: registerUser, getCurrentUser, CRUD operations for sessions/messages/farms/animals,
 * response mappers, error handling, timeout handling.
 */

jest.mock('../../utils/deviceInfo', () => ({
  getDeviceId: jest.fn(() => Promise.resolve('test-device-id')),
  getDeviceInfo: jest.fn(() =>
    Promise.resolve({
      deviceId: 'test-device-id',
      platform: 'ios',
      appVersion: '1.0.0',
    })
  ),
}));

jest.mock('../../utils/apiHelpers', () => ({
  fetchWithTimeout: jest.fn(),
  parseErrorMessage: jest.fn(),
  isNetworkError: jest.fn(),
}));

jest.mock('../../utils/config', () => ({
  API_BASE_URL: 'https://test-api.example.com',
  API_KEY: 'test-api-key',
  TIMEOUTS: { DB: 30000, CHAT: 60000, DEFAULT: 30000, WEATHER: 30000 },
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => key),
}));

import { fetchWithTimeout } from '../../utils/apiHelpers';
import {
  registerUser,
  getCurrentUser,
  updatePreferences,
  saveLocation,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  saveMessage,
  getMessages,
  updateMessage,
  lookupLocation,
  generateTitle,
  getProfile,
  updateProfile,
  getFarms,
  createFarm,
  updateFarm,
  deleteFarm,
  getAnimals,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  recordAnimalEvent,
  getMasterCrops,
  getMasterLivestock,
  createPlot,
  allocateCrop,
  deleteAccount,
  logEvent,
} from '../../services/db';

const mockResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
});

describe('services/db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── User management ──
  describe('registerUser', () => {
    it('registers successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, id: 'user-1' })
      );

      const result = await registerUser();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-1');
    });

    it('returns error on HTTP failure', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ error: 'Server error' }, false, 500)
      );

      const result = await registerUser();
      expect(result.success).toBe(false);
    });

    it('returns error on network failure', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await registerUser();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns error when success is false in response', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: false, error: 'Duplicate' })
      );

      const result = await registerUser();
      expect(result.success).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns user on success', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, user: { id: 'u1', name: 'Test' } })
      );

      const user = await getCurrentUser();
      expect(user).toEqual({ id: 'u1', name: 'Test' });
    });

    it('returns null on HTTP error', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse({}, false, 404));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns null on exception', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('fail'));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('sends preferences with deviceId', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await updatePreferences({ languageCode: 'hi' });
      expect(result.success).toBe(true);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/preferences'),
        expect.objectContaining({ method: 'PUT' }),
        30000
      );
    });
  });

  // ── Session management ──
  describe('createSession', () => {
    it('creates session successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, session: { id: 'sess-1' } })
      );

      const result = await createSession({ primaryLanguageCode: 'en' });
      expect(result.success).toBe(true);
      expect(result.session).toEqual({ id: 'sess-1' });
    });

    it('returns error on failure', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse({}, false, 500));

      const result = await createSession();
      expect(result.success).toBe(false);
    });
  });

  describe('getSession', () => {
    it('fetches session with messages', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({
          success: true,
          session: { id: 's1', messages: [{ id: 'm1', content: 'Hi' }] },
        })
      );

      const result = await getSession('s1');
      expect(result.success).toBe(true);
      expect(result.session!.messages).toHaveLength(1);
    });
  });

  describe('updateSession', () => {
    it('updates session title', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await updateSession('s1', { title: 'New Title' });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteSession', () => {
    it('deletes session successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await deleteSession('s1');
      expect(result.success).toBe(true);
    });
  });

  // ── Message management ──
  describe('saveMessage', () => {
    it('saves message with deviceId', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, message: { id: 'm1' } })
      );

      const result = await saveMessage({ sessionId: 's1', content: 'Hello', role: 'user' });
      expect(result.success).toBe(true);
    });

    it('returns error on failure', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await saveMessage({ sessionId: 's1', content: 'Hi' });
      expect(result.success).toBe(false);
    });
  });

  describe('getMessages', () => {
    it('fetches messages for session', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, messages: [{ id: 'm1' }] })
      );

      const result = await getMessages('s1');
      expect(result.success).toBe(true);
    });
  });

  describe('updateMessage', () => {
    it('updates message feedback', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await updateMessage('m1', { feedback: 'positive' });
      expect(result.success).toBe(true);
    });
  });

  // ── Profile ──
  describe('getProfile', () => {
    it('fetches profile successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { name: 'John' } })
      );

      const result = await getProfile();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John' });
    });
  });

  describe('updateProfile', () => {
    it('updates profile fields', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { name: 'Jane' } })
      );

      const result = await updateProfile({ name: 'Jane' } as any);
      expect(result.success).toBe(true);
    });

    it('handles error response with body', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ error: 'Invalid phone' }),
      });

      const result = await updateProfile({ phone: 'bad' } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone');
    });
  });

  // ── Farm management ──
  describe('getFarms', () => {
    it('maps nested farm relations', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({
          success: true,
          data: [
            {
              id: 'f1',
              name: 'Farm',
              plots: [
                {
                  id: 'p1',
                  name: 'Plot',
                  cropAllocations: [{ id: 'ca1', crop: { name: 'Maize' } }],
                },
              ],
            },
          ],
        })
      );

      const result = await getFarms();
      expect(result.success).toBe(true);
      const farm = result.data![0];
      expect(farm.plots[0].cropAllocations[0].cropName).toBe('Maize');
    });
  });

  describe('createFarm', () => {
    it('creates farm', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'f1', name: 'My Farm' } })
      );

      const result = await createFarm({ name: 'My Farm' });
      expect(result.success).toBe(true);
    });
  });

  describe('updateFarm', () => {
    it('updates farm', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'f1', name: 'Updated' } })
      );

      const result = await updateFarm('f1', { name: 'Updated' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteFarm', () => {
    it('deletes farm', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse({}, true));

      const result = await deleteFarm('f1');
      expect(result.success).toBe(true);
    });
  });

  // ── Animal management ──
  describe('getAnimals', () => {
    it('maps livestock name from nested relation', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({
          success: true,
          data: [{ id: 'a1', livestock: { name: 'Cattle' } }],
        })
      );

      const result = await getAnimals();
      expect(result.data![0].livestockName).toBe('Cattle');
    });

    it('handles status filter', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: [] })
      );

      await getAnimals('active');
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('createAnimal', () => {
    it('creates animal', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'a1' } })
      );

      const result = await createAnimal({ livestockId: 'l1', name: 'Bessie' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('recordAnimalEvent', () => {
    it('records event', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'ev1' } })
      );

      const result = await recordAnimalEvent('a1', { eventType: 'vaccination' as any });
      expect(result.success).toBe(true);
    });
  });

  // ── Master data ──
  describe('getMasterCrops', () => {
    it('fetches with language param', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: [{ id: 'c1' }] })
      );

      const result = await getMasterCrops({ lang: 'hi' });
      expect(result.success).toBe(true);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('lang=hi'),
        expect.anything(),
        expect.anything()
      );
    });

    it('handles no params', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: [] })
      );

      const result = await getMasterCrops();
      expect(result.success).toBe(true);
    });
  });

  describe('getMasterLivestock', () => {
    it('fetches successfully', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: [{ id: 'l1' }] })
      );

      const result = await getMasterLivestock({ lang: 'en' });
      expect(result.success).toBe(true);
    });
  });

  // ── Plot / Crop allocation ──
  describe('createPlot', () => {
    it('creates plot', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'p1' } })
      );

      const result = await createPlot('f1', { name: 'Main Plot' });
      expect(result.success).toBe(true);
    });
  });

  describe('allocateCrop', () => {
    it('allocates crop and maps relations', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, data: { id: 'ca1', crop: { name: 'Wheat' } } })
      );

      const result = await allocateCrop('p1', { cropId: 'c1' } as any);
      expect(result.success).toBe(true);
      expect(result.data!.cropName).toBe('Wheat');
    });
  });

  // ── Location ──
  describe('lookupLocation', () => {
    it('looks up by GPS coordinates', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, level1Country: 'Kenya' })
      );

      const result = await lookupLocation(1.0, 36.0);
      expect(result.success).toBe(true);
    });

    it('handles API error', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ error: 'Not found' }, false, 404)
      );

      const result = await lookupLocation(0, 0);
      expect(result.success).toBe(false);
    });
  });

  // ── Title generation ──
  describe('generateTitle', () => {
    it('generates title from messages', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true, title: 'Tomato Disease Help' })
      );

      const result = await generateTitle(
        [{ role: 'user', content: 'My tomato is sick' }],
        'en'
      );
      expect(result.success).toBe(true);
      expect(result.title).toBe('Tomato Disease Help');
    });

    it('returns fallback title on failure', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('fail'));

      const result = await generateTitle([], 'en');
      expect(result.success).toBe(false);
      expect(result.title).toBeDefined();
    });
  });

  // ── Delete account ──
  describe('deleteAccount', () => {
    it('deletes account', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await deleteAccount();
      expect(result.success).toBe(true);
    });
  });

  // ── Analytics ──
  describe('logEvent', () => {
    it('logs event silently', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(mockResponse({}));

      await logEvent('chat_sent', { type: 'text' }, 's1');
      expect(fetchWithTimeout).toHaveBeenCalled();
    });

    it('does not throw on failure', async () => {
      (fetchWithTimeout as jest.Mock).mockRejectedValue(new Error('fail'));

      // Should not throw
      await logEvent('chat_sent');
    });
  });

  // ── Save location ──
  describe('saveLocation', () => {
    it('saves location', async () => {
      (fetchWithTimeout as jest.Mock).mockResolvedValue(
        mockResponse({ success: true })
      );

      const result = await saveLocation({ latitude: 1.0, longitude: 36.0 } as any);
      expect(result.success).toBe(true);
    });
  });
});
