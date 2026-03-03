/**
 * Tests for OfflineIndicator component
 * Covers: shows when offline, hides when online, network state subscription.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

let netInfoCallback: ((state: { isConnected: boolean | null }) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback: any) => {
    netInfoCallback = callback;
    return mockUnsubscribe;
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

jest.mock('../../contexts/AppContext', () => ({
  useApp: jest.fn(() => ({
    theme: {
      warning: '#FFC107',
      text: '#000',
      textMuted: '#666',
      background: '#fff',
    },
  })),
}));

jest.mock('../../components/ui/AppIcon', () => {
  const { Text } = require('react-native');
  return function MockAppIcon({ name }: { name: string }) {
    return <Text testID={`icon-${name}`}>{name}</Text>;
  };
});

jest.mock('../../constants/themes', () => ({
  TYPOGRAPHY: {
    sizes: { sm: 14 },
    weights: { semibold: '600' },
  },
}));

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    if (key === 'system.offline') return 'You are offline';
    return key;
  }),
}));

import OfflineIndicator from '../../components/OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    netInfoCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when online', () => {
    const { toJSON } = render(<OfflineIndicator />);

    // Simulate online state
    act(() => {
      netInfoCallback?.({ isConnected: true });
    });

    expect(toJSON()).toBeNull();
  });

  it('shows banner after settle time when offline', () => {
    const { queryByText } = render(<OfflineIndicator />);

    // Advance past settle time
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    // Now simulate offline
    act(() => {
      netInfoCallback?.({ isConnected: false });
    });

    expect(queryByText('You are offline')).toBeTruthy();
  });

  it('hides banner when coming back online', () => {
    const { queryByText } = render(<OfflineIndicator />);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    act(() => {
      netInfoCallback?.({ isConnected: false });
    });

    expect(queryByText('You are offline')).toBeTruthy();

    act(() => {
      netInfoCallback?.({ isConnected: true });
    });

    // After going back online, component returns null
    expect(queryByText('You are offline')).toBeNull();
  });

  it('subscribes to NetInfo and unsubscribes on unmount', () => {
    const NetInfo = require('@react-native-community/netinfo');
    const { unmount } = render(<OfflineIndicator />);

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('shows offline icon', () => {
    const { getByTestId } = render(<OfflineIndicator />);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    act(() => {
      netInfoCallback?.({ isConnected: false });
    });

    expect(getByTestId('icon-cloud-offline')).toBeTruthy();
  });

  it('does not show offline during initial settle period', () => {
    const { queryByText } = render(<OfflineIndicator />);

    // Send offline before settle time
    act(() => {
      netInfoCallback?.({ isConnected: false });
    });

    // Should NOT show (settle time not elapsed)
    expect(queryByText('You are offline')).toBeNull();
  });
});
