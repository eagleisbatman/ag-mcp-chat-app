/**
 * Tests for components/a2ui/picker/PickerFormStep.tsx
 * Covers: text/number/decimal/select/toggle fields, validation,
 * required field enforcement, submit button, field errors.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../contexts/AppContext', () => ({
  useApp: jest.fn(() => ({
    theme: {
      name: 'dark',
      text: '#fff',
      textMuted: '#999',
      accent: '#4CAF50',
      background: '#000',
      surface: '#111',
      surfaceVariant: '#222',
      border: '#333',
      inputBorder: '#444',
    },
  })),
}));

jest.mock('../../../constants/themes', () => ({
  SPACING: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24,
  },
  TYPOGRAPHY: {
    sizes: { xs: 12, sm: 14, md: 16, lg: 18 },
    weights: { medium: '500', semibold: '600' },
  },
}));

jest.mock('../../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'a2ui.fieldRequired': 'Required',
      'a2ui.fieldMustBePositive': 'Must be a positive number',
      'a2ui.fieldMaxValue': 'Maximum',
      'chat.addButton': 'Add',
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

import PickerFormStep from '../../../components/a2ui/picker/PickerFormStep';

describe('PickerFormStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('text fields', () => {
    it('renders text input with label', () => {
      const { getByText, getByPlaceholderText } = render(
        <PickerFormStep
          fields={[{ key: 'name', label: 'Farm Name', placeholder: 'Enter name', type: 'text' }]}
          onSubmit={jest.fn()}
        />
      );

      expect(getByText('Farm Name')).toBeTruthy();
      expect(getByPlaceholderText('Enter name')).toBeTruthy();
    });

    it('calls onSubmit with form data when valid', () => {
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'name', label: 'Name', placeholder: 'Name...', type: 'text' }]}
          onSubmit={onSubmit}
        />
      );

      fireEvent.changeText(getByPlaceholderText('Name...'), 'My Farm');
      fireEvent.press(getByText('Add'));

      expect(onSubmit).toHaveBeenCalledWith({ name: 'My Farm' });
    });

    it('shows error for required empty field on submit attempt', () => {
      const onSubmit = jest.fn();
      const { getByText } = render(
        <PickerFormStep
          fields={[{ key: 'name', label: 'Name', placeholder: '', type: 'text' }]}
          onSubmit={onSubmit}
        />
      );

      // Submit without entering anything
      fireEvent.press(getByText('Add'));

      expect(getByText('Required')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not show error for optional empty field', () => {
      const onSubmit = jest.fn();
      const { getByText, queryByText } = render(
        <PickerFormStep
          fields={[{ key: 'notes', label: 'Notes', placeholder: '', type: 'text', optional: true }]}
          onSubmit={onSubmit}
        />
      );

      fireEvent.press(getByText('Add'));
      expect(queryByText('Required')).toBeNull();
      expect(onSubmit).toHaveBeenCalledWith({});
    });
  });

  describe('number fields', () => {
    it('shows error for zero or negative number', () => {
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'area', label: 'Area', placeholder: '0', type: 'number' }]}
          onSubmit={jest.fn()}
        />
      );

      fireEvent.changeText(getByPlaceholderText('0'), '0');
      fireEvent.press(getByText('Add'));

      expect(getByText('Must be a positive number')).toBeTruthy();
    });

    it('shows error for NaN input', () => {
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'area', label: 'Area', placeholder: '0', type: 'number' }]}
          onSubmit={jest.fn()}
        />
      );

      fireEvent.changeText(getByPlaceholderText('0'), 'abc');
      fireEvent.press(getByText('Add'));

      expect(getByText('Must be a positive number')).toBeTruthy();
    });

    it('shows error when exceeding maxValue', () => {
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'size', label: 'Size', placeholder: '0', type: 'number', maxValue: 100 }]}
          onSubmit={jest.fn()}
        />
      );

      fireEvent.changeText(getByPlaceholderText('0'), '200');
      fireEvent.press(getByText('Add'));

      expect(getByText('Maximum: 100')).toBeTruthy();
    });

    it('accepts valid positive number', () => {
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'area', label: 'Area', placeholder: '0', type: 'number' }]}
          onSubmit={onSubmit}
        />
      );

      fireEvent.changeText(getByPlaceholderText('0'), '10');
      fireEvent.press(getByText('Add'));

      expect(onSubmit).toHaveBeenCalledWith({ area: '10' });
    });
  });

  describe('decimal fields', () => {
    it('accepts valid decimal number', () => {
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <PickerFormStep
          fields={[{ key: 'weight', label: 'Weight', placeholder: '0.0', type: 'decimal' }]}
          onSubmit={onSubmit}
        />
      );

      fireEvent.changeText(getByPlaceholderText('0.0'), '3.5');
      fireEvent.press(getByText('Add'));

      expect(onSubmit).toHaveBeenCalledWith({ weight: '3.5' });
    });
  });

  describe('select fields', () => {
    const selectField = {
      key: 'breed',
      label: 'Breed',
      placeholder: 'Select breed',
      type: 'select' as const,
      options: [
        { value: 'jersey', label: 'Jersey' },
        { value: 'holstein', label: 'Holstein' },
      ],
    };

    it('renders select trigger with placeholder', () => {
      const { getByText } = render(
        <PickerFormStep
          fields={[selectField]}
          onSubmit={jest.fn()}
        />
      );

      expect(getByText('Select breed')).toBeTruthy();
    });

    it('opens dropdown when pressed', () => {
      const { getByText } = render(
        <PickerFormStep
          fields={[selectField]}
          onSubmit={jest.fn()}
        />
      );

      fireEvent.press(getByText('Select breed'));

      expect(getByText('Jersey')).toBeTruthy();
      expect(getByText('Holstein')).toBeTruthy();
    });

    it('selects an option and closes dropdown', () => {
      const { getByText, queryByText } = render(
        <PickerFormStep
          fields={[selectField]}
          onSubmit={jest.fn()}
        />
      );

      // Open
      fireEvent.press(getByText('Select breed'));
      // Select
      fireEvent.press(getByText('Jersey'));

      // Dropdown should close, selected text shown
      expect(getByText('Jersey')).toBeTruthy();
    });
  });

  describe('toggle fields', () => {
    const toggleField = {
      key: 'irrigated',
      label: 'Irrigated',
      placeholder: '',
      type: 'toggle' as const,
      toggleLabels: { on: 'Yes', off: 'No' },
    };

    it('renders toggle with label', () => {
      const { getByText } = render(
        <PickerFormStep
          fields={[toggleField]}
          onSubmit={jest.fn()}
        />
      );

      expect(getByText('Irrigated')).toBeTruthy();
      expect(getByText('No')).toBeTruthy();
    });

    it('toggle is always valid (no validation error)', () => {
      const onSubmit = jest.fn();
      const { getByText } = render(
        <PickerFormStep
          fields={[toggleField]}
          onSubmit={onSubmit}
        />
      );

      fireEvent.press(getByText('Add'));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('multiple fields', () => {
    it('renders all fields and validates all on submit', () => {
      const onSubmit = jest.fn();
      const { getByText, getAllByText } = render(
        <PickerFormStep
          fields={[
            { key: 'name', label: 'Name', placeholder: '', type: 'text' },
            { key: 'area', label: 'Area', placeholder: '', type: 'number' },
          ]}
          onSubmit={onSubmit}
        />
      );

      // Submit without filling
      fireEvent.press(getByText('Add'));

      // Both required errors should appear
      const requiredErrors = getAllByText('Required');
      expect(requiredErrors.length).toBe(2);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('custom submit label', () => {
    it('uses custom submitLabel when provided', () => {
      const { getByText } = render(
        <PickerFormStep
          fields={[{ key: 'n', label: 'N', placeholder: '', type: 'text', optional: true }]}
          submitLabel="Save Farm"
          onSubmit={jest.fn()}
        />
      );

      expect(getByText('Save Farm')).toBeTruthy();
    });
  });
});
