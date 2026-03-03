/**
 * Tests for hooks/useA2UIPicker.ts
 * Covers: picker state management, openPicker (registered + unregistered types),
 * handleComplete, handleClose, items mapping, suggested items, profile actions.
 */

jest.mock('../../contexts/app/ProfileContext', () => ({
  useProfile: jest.fn(() => ({
    masterCrops: [
      { id: 'c1', name: 'Maize', category: 'Cereals' },
      { id: 'c2', name: 'Rice', category: 'Cereals' },
      { id: 'c3', name: 'Tomato', category: 'Vegetables' },
    ],
    masterLivestock: [
      { id: 'l1', name: 'Cattle', category: 'Large' },
    ],
    addCropToDefaultPlot: jest.fn().mockResolvedValue(true),
    addAnimal: jest.fn().mockResolvedValue({ id: 'a1' }),
  })),
}));

jest.mock('../../components/a2ui/picker/pickerRegistry', () => ({
  getPickerConfig: jest.fn((type: string) => {
    if (type === 'crop_picker') {
      return {
        title: 'Select Crop',
        steps: [{ type: 'list', searchPlaceholder: 'Search crops...' }],
        mapItems: jest.fn(({ masterCrops }: any) =>
          masterCrops.map((c: any) => ({ id: c.id, label: c.name, category: c.category }))
        ),
        onComplete: jest.fn().mockResolvedValue({
          text: 'Selected Maize',
          saved: true,
          responseData: { cropId: 'c1' },
        }),
      };
    }
    return null; // Unregistered type
  }),
}));

jest.mock('../../components/a2ui/picker/configs', () => {});

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'a2ui.dismissed': '[Dismissed]',
      'chat.profileSaveFailed': 'Save failed',
      'chat.profileSaved': 'Saved!',
    };
    return map[key] || key;
  }),
}));

jest.mock('../../services/api/core', () => ({
  API_BASE_URL: 'https://test.example.com',
  API_KEY: 'test-key',
  ensureDeviceId: jest.fn().mockResolvedValue('device-123'),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useA2UIPicker } from '../../hooks/useA2UIPicker';

const createDeps = (overrides: Partial<Parameters<typeof useA2UIPicker>[0]> = {}) => ({
  handleSendText: jest.fn(),
  scrollToBottom: jest.fn(),
  showSuccess: jest.fn(),
  showError: jest.fn(),
  respondedA2UIWidgetIds: new Set<string>(),
  setRespondedA2UIWidgetIds: jest.fn(),
  ...overrides,
});

describe('useA2UIPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with picker closed', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      expect(result.current.pickerState.visible).toBe(false);
      expect(result.current.pickerState.widget).toBeNull();
      expect(result.current.pickerState.config).toBeNull();
    });

    it('has empty items when no config is active', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));
      expect(result.current.items).toEqual([]);
    });

    it('provides profile actions', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));
      expect(result.current.profileActions).toHaveProperty('addCropToDefaultPlot');
      expect(result.current.profileActions).toHaveProperty('addAnimal');
    });
  });

  describe('openPicker', () => {
    it('opens picker for registered widget type', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select your crop',
        } as any);
      });

      expect(result.current.pickerState.visible).toBe(true);
      expect(result.current.pickerState.config).toBeTruthy();
    });

    it('maps items when config is active', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select crop',
        } as any);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0]).toEqual(
        expect.objectContaining({ id: 'c1', label: 'Maize' })
      );
    });

    it('falls back to text for unregistered widget type', () => {
      const mockSendText = jest.fn();
      const mockSetResponded = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({
          handleSendText: mockSendText,
          setRespondedA2UIWidgetIds: mockSetResponded,
        }))
      );

      act(() => {
        result.current.openPicker({
          widgetId: 'w-unknown',
          widgetType: 'unknown_widget',
          title: 'Unknown Widget',
        } as any);
      });

      // Should NOT open the picker
      expect(result.current.pickerState.visible).toBe(false);
      // Should send text directly
      expect(mockSendText).toHaveBeenCalledWith('Unknown Widget');
      expect(mockSetResponded).toHaveBeenCalled();
    });
  });

  describe('handleClose', () => {
    it('closes the picker and sends dismissed text', () => {
      const mockSendText = jest.fn();
      const mockSetResponded = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({
          handleSendText: mockSendText,
          setRespondedA2UIWidgetIds: mockSetResponded,
        }))
      );

      // Open first
      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select',
        } as any);
      });

      // Close
      act(() => {
        result.current.handleClose();
      });

      expect(result.current.pickerState.visible).toBe(false);
      expect(mockSendText).toHaveBeenCalledWith('[Dismissed]');
      expect(mockSetResponded).toHaveBeenCalled();
    });

    it('does nothing when no widget is open', () => {
      const mockSendText = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({ handleSendText: mockSendText }))
      );

      act(() => {
        result.current.handleClose();
      });

      expect(mockSendText).not.toHaveBeenCalled();
    });
  });

  describe('handleComplete', () => {
    it('sends text and closes picker', () => {
      const mockSendText = jest.fn();
      const mockSetResponded = jest.fn();
      const mockScrollToBottom = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({
          handleSendText: mockSendText,
          setRespondedA2UIWidgetIds: mockSetResponded,
          scrollToBottom: mockScrollToBottom,
        }))
      );

      // Open first
      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select',
        } as any);
      });

      // Complete
      act(() => {
        result.current.handleComplete('I selected Maize', { cropId: 'c1' });
      });

      expect(mockSendText).toHaveBeenCalledWith(
        'I selected Maize',
        expect.objectContaining({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          displayText: 'I selected Maize',
        })
      );
      expect(mockSetResponded).toHaveBeenCalled();
      expect(mockScrollToBottom).toHaveBeenCalled();
      expect(result.current.pickerState.visible).toBe(false);
    });
  });

  describe('suggestedItems', () => {
    it('returns undefined when no context', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select',
        } as any);
      });

      expect(result.current.suggestedItems).toBeUndefined();
    });

    it('extracts suggested crops from widget context', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select',
          context: { suggestedCrops: ['Maize', 'Rice'] },
        } as any);
      });

      expect(result.current.suggestedItems).toEqual(['Maize', 'Rice']);
    });

    it('filters out non-string values from suggested', () => {
      const { result } = renderHook(() => useA2UIPicker(createDeps()));

      act(() => {
        result.current.openPicker({
          widgetId: 'w1',
          widgetType: 'crop_picker',
          title: 'Select',
          context: { suggestedCrops: ['Maize', null, 42, 'Rice'] },
        } as any);
      });

      expect(result.current.suggestedItems).toEqual(['Maize', 'Rice']);
    });
  });

  describe('handleSaveError / handleSaveSuccess', () => {
    it('handleSaveError calls showError', () => {
      const mockShowError = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({ showError: mockShowError }))
      );

      act(() => {
        result.current.handleSaveError();
      });

      expect(mockShowError).toHaveBeenCalledWith('Save failed');
    });

    it('handleSaveSuccess calls showSuccess', () => {
      const mockShowSuccess = jest.fn();
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({ showSuccess: mockShowSuccess }))
      );

      act(() => {
        result.current.handleSaveSuccess();
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('Saved!');
    });
  });

  describe('onBehalfOfFarmerUserId', () => {
    it('passes through to profileActions', () => {
      const { result } = renderHook(() =>
        useA2UIPicker(createDeps({ onBehalfOfFarmerUserId: 'farmer-99' }))
      );

      expect(result.current.profileActions.onBehalfOfFarmerUserId).toBe('farmer-99');
    });
  });
});
