/**
 * Tests for components/a2ui/picker/PickerSheet.tsx
 * Covers: list rendering, search filtering, item selection, form step,
 * confirmation step, close handler, empty states, suggested items.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../contexts/AppContext', () => ({
  useApp: jest.fn(() => ({
    theme: {
      name: 'dark',
      text: '#fff',
      textMuted: '#999',
      textSecondary: '#aaa',
      accent: '#4CAF50',
      background: '#000',
      surface: '#111',
      surfaceVariant: '#222',
      border: '#333',
      inputBorder: '#444',
      error: '#f44',
      errorLight: 'rgba(255,59,48,0.12)',
      icon: '#ccc',
      userMessage: '#333',
      userMessageText: '#fff',
    },
  })),
}));

jest.mock('../../../constants/themes', () => ({
  SPACING: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48,
  },
  TYPOGRAPHY: {
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, base: 16 },
    weights: { medium: '500', semibold: '600', bold: '700' },
    lineHeights: { normal: 1.4 },
  },
}));

jest.mock('../../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'chat.search': 'Search...',
      'chat.suggested': 'Suggested',
      'chat.loading': 'Loading...',
      'chat.noResults': 'No results found',
      'chat.saving': 'Saving...',
      'common.submit': 'Submit',
      'common.yes': 'Yes',
      'common.no': 'No',
      'a2ui.notListed': 'Not listed? Type a name',
    };
    return map[key] || key;
  }),
}));

jest.mock('../../../components/ui/AppIcon', () => {
  const { Text } = require('react-native');
  return function MockAppIcon({ name }: { name: string }) {
    return <Text testID={`icon-${name}`}>{name}</Text>;
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../../components/a2ui/picker/PickerFormStep', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockPickerFormStep({ fields, onSubmit }: any) {
    return (
      <View testID="form-step">
        <Text>Form with {fields.length} fields</Text>
        <TouchableOpacity testID="form-submit" onPress={() => onSubmit({ name: 'Test' })}>
          <Text>Submit Form</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

import PickerSheet from '../../../components/a2ui/picker/PickerSheet';

const makeConfig = (overrides: Partial<any> = {}) => ({
  key: 'test_picker',
  title: 'Select Item',
  steps: [{ type: 'list' as const, searchPlaceholder: 'Search...' }],
  mapItems: jest.fn(() => []),
  onComplete: jest.fn().mockResolvedValue({ text: 'Selected', saved: false }),
  ...overrides,
});

const makeItems = () => [
  { id: '1', label: 'Maize', category: 'Cereals' },
  { id: '2', label: 'Rice', category: 'Cereals' },
  { id: '3', label: 'Tomato', category: 'Vegetables', sublabel: 'Fresh' },
];

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  config: makeConfig(),
  items: makeItems(),
  profileActions: {
    addCropToDefaultPlot: jest.fn(),
    addAnimal: jest.fn(),
  },
  onComplete: jest.fn(),
};

describe('PickerSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list step', () => {
    it('renders title from config', () => {
      const { getByText } = render(<PickerSheet {...defaultProps} />);
      expect(getByText('Select Item')).toBeTruthy();
    });

    it('renders override title when provided', () => {
      const { getByText } = render(<PickerSheet {...defaultProps} title="Custom Title" />);
      expect(getByText('Custom Title')).toBeTruthy();
    });

    it('renders items in the list', () => {
      const { getByText } = render(<PickerSheet {...defaultProps} />);
      expect(getByText('Maize')).toBeTruthy();
      expect(getByText('Rice')).toBeTruthy();
      expect(getByText('Tomato')).toBeTruthy();
    });

    it('renders sublabels when present', () => {
      const { getByText } = render(<PickerSheet {...defaultProps} />);
      expect(getByText('Fresh')).toBeTruthy();
    });

    it('renders category headers', () => {
      const { getByText } = render(<PickerSheet {...defaultProps} />);
      expect(getByText('Cereals')).toBeTruthy();
      expect(getByText('Vegetables')).toBeTruthy();
    });

    it('renders search input', () => {
      const { getByPlaceholderText } = render(<PickerSheet {...defaultProps} />);
      expect(getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('filters items based on search text', () => {
      const { getByPlaceholderText, queryByText } = render(
        <PickerSheet {...defaultProps} />
      );

      fireEvent.changeText(getByPlaceholderText('Search...'), 'Tom');

      expect(queryByText('Tomato')).toBeTruthy();
      expect(queryByText('Maize')).toBeNull();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <PickerSheet {...defaultProps} onClose={onClose} />
      );

      fireEvent.press(getByTestId('icon-close'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('item selection (single-step)', () => {
    it('calls config.onComplete when item is tapped', async () => {
      const mockOnComplete = jest.fn().mockResolvedValue({ text: 'Maize', saved: false });
      const onComplete = jest.fn();

      const { getByText } = render(
        <PickerSheet
          {...defaultProps}
          config={makeConfig({ onComplete: mockOnComplete })}
          onComplete={onComplete}
        />
      );

      fireEvent.press(getByText('Maize'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', label: 'Maize' }),
          undefined,
          undefined,
          expect.any(Object)
        );
      });
    });
  });

  describe('multi-step (list + form)', () => {
    it('advances to form step after item selection', () => {
      const config = makeConfig({
        steps: [
          { type: 'list' as const },
          { type: 'form' as const, fields: [{ key: 'name', label: 'Name', type: 'text', placeholder: '' }] },
        ],
      });

      const { getByText, getByTestId } = render(
        <PickerSheet {...defaultProps} config={config} />
      );

      fireEvent.press(getByText('Maize'));

      // Should show the form step now
      expect(getByTestId('form-step')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows loading text when items array is empty', () => {
      const { getByText } = render(
        <PickerSheet
          {...defaultProps}
          items={[]}
          config={makeConfig({ steps: [{ type: 'list' as const, loadingText: 'Fetching...' }] })}
        />
      );

      expect(getByText('Fetching...')).toBeTruthy();
    });

    it('shows no results when search yields nothing', () => {
      const { getByPlaceholderText, getByText } = render(
        <PickerSheet {...defaultProps} />
      );

      fireEvent.changeText(getByPlaceholderText('Search...'), 'zzzznonexistent');

      expect(getByText('No results found')).toBeTruthy();
    });
  });

  describe('suggested items', () => {
    it('renders suggested section when suggestedItems provided', () => {
      const { getByText } = render(
        <PickerSheet
          {...defaultProps}
          suggestedItems={['Maize']}
        />
      );

      expect(getByText('Suggested')).toBeTruthy();
    });
  });

  describe('confirmation step', () => {
    it('renders Yes/No buttons for confirmation step', () => {
      const config = makeConfig({
        steps: [{ type: 'confirmation' as const, confirmLabel: 'Confirm', cancelLabel: 'Cancel' }],
      });

      const { getByText } = render(
        <PickerSheet {...defaultProps} config={config} />
      );

      expect(getByText('Confirm')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('when not visible', () => {
    it('renders nothing when visible=false (Modal suppresses children)', () => {
      const { toJSON } = render(
        <PickerSheet {...defaultProps} visible={false} />
      );

      // In test environment, Modal with visible=false renders null
      // This is expected behavior
      expect(toJSON()).toBeNull();
    });
  });
});
