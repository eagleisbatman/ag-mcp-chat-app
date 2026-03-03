/**
 * Tests for ErrorBoundary component
 * Covers: normal rendering, error catching, fallback UI, error recovery.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';

jest.mock('../../components/ui/AppIcon', () => {
  const { Text: RNText } = require('react-native');
  return function MockAppIcon({ name }: { name: string }) {
    return <RNText testID={`icon-${name}`}>{name}</RNText>;
  };
});

jest.mock('../../constants/themes', () => ({
  TYPOGRAPHY: {
    sizes: { xl: 20, base: 16 },
    weights: { bold: '700', semibold: '600' },
    lineHeights: { relaxed: 1.5 },
  },
}));

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'system.errorTitle': 'Something went wrong',
      'system.errorFallback': 'The app encountered an error.',
      'system.tryAgain': 'Try Again',
    };
    return map[key] || key;
  }),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import ErrorBoundary from '../../components/ErrorBoundary';

// Component that throws — return never-reached null to satisfy JSX return type
function BrokenComponent(): JSX.Element {
  throw new Error('Test crash');
}

function GoodComponent() {
  return <Text testID="good">Everything works</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error from React error boundary
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children normally when no error', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(getByTestId('good')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(queryByTestId('good')).toBeNull();
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('The app encountered an error.')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('recovers when Try Again is pressed', () => {
    let shouldThrow = true;

    function MaybeBreak() {
      if (shouldThrow) throw new Error('boom');
      return <Text testID="recovered">Recovered!</Text>;
    }

    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <MaybeBreak />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(getByText('Try Again')).toBeTruthy();

    // Fix the component and retry
    shouldThrow = false;
    fireEvent.press(getByText('Try Again'));

    expect(queryByTestId('recovered')).toBeTruthy();
  });

  it('calls componentDidCatch when error occurs', () => {
    const logError = require('../../utils/logger').error;

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(logError).toHaveBeenCalledWith(
      'ErrorBoundary caught error:',
      expect.any(Error),
      expect.anything()
    );
  });

  it('shows warning icon in fallback UI', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(getByTestId('icon-warning-outline')).toBeTruthy();
  });
});
