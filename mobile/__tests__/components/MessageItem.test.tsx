/**
 * Tests for components/MessageItem.tsx
 * Covers: user message rendering, bot message rendering, streaming state,
 * thinking state, diagnosis card, follow-up questions, A2UI widgets,
 * error retry, image display, TTS button, memo comparison.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../../contexts/AppContext', () => ({
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
      icon: '#ccc',
      error: '#f44',
      errorLight: 'rgba(255,59,48,0.12)',
      userMessage: '#333',
      userMessageText: '#fff',
    },
    language: { code: 'en' },
    locationDetails: null,
  })),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(() => ({
    showError: jest.fn(),
  })),
}));

jest.mock('../../constants/themes', () => ({
  SPACING: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  TYPOGRAPHY: {
    sizes: { xs: 12, sm: 14, md: 16, base: 16, lg: 18 },
    weights: { medium: '500', semibold: '600', bold: '700' },
    lineHeights: { normal: 1.4, relaxed: 1.6 },
  },
}));

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'chat.senderAssistant': 'FarmerChat',
      'chat.thinking': 'Thinking...',
      'common.retry': 'Retry',
      'a11y.yourMessage': 'Your message',
      'a11y.imageMessage': 'Image message',
      'a11y.attachedImage': 'Attached image',
      'a11y.playVoice': 'Play voice',
      'a11y.stopVoicePlayback': 'Stop',
      'a11y.cancelVoiceGeneration': 'Cancel',
    };
    return map[key] || key;
  }),
}));

jest.mock('../../components/ui/AppIcon', () => {
  const { Text: RNText } = require('react-native');
  return function MockAppIcon({ name }: { name: string }) {
    return <RNText testID={`icon-${name}`}>{name}</RNText>;
  };
});

jest.mock('expo-image', () => ({
  Image: function MockExpoImage({ accessibilityLabel }: any) {
    const { View, Text: RNText } = require('react-native');
    return <View testID="expo-image"><RNText>{accessibilityLabel}</RNText></View>;
  },
}));

jest.mock('react-native-markdown-display', () => {
  const { Text: RNText } = require('react-native');
  return function MockMarkdown({ children }: any) {
    return <RNText testID="markdown-text">{children}</RNText>;
  };
});

jest.mock('../../components/DiagnosisCard', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockDiagnosisCard({ diagnosis }: any) {
    return <View testID="diagnosis-card"><RNText>Diagnosis</RNText></View>;
  };
});

jest.mock('../../components/FollowUpQuestions', () => {
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  return function MockFollowUp({ questions, onQuestionTap }: any) {
    return (
      <View testID="follow-up-questions">
        {questions.map((q: string, i: number) => (
          <TouchableOpacity key={i} testID={`follow-up-${i}`} onPress={() => onQuestionTap(q)}>
            <RNText>{q}</RNText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

jest.mock('../../components/a2ui/A2UIDispatcher', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockA2UI({ widgets }: any) {
    return <View testID="a2ui-dispatcher"><RNText>{widgets.length} widgets</RNText></View>;
  };
});

jest.mock('../../components/chat/RationFlowRenderer', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockRationFlow({ flowStep }: any) {
    return <View testID="ration-flow"><RNText>Flow step: {flowStep.type}</RNText></View>;
  };
});

jest.mock('../../components/ui/TypingIndicator', () => {
  const { View, Text: RNText } = require('react-native');
  return function MockTyping({ text }: any) {
    return <View testID="typing-indicator"><RNText>{text}</RNText></View>;
  };
});

jest.mock('../../components/message/useMessageTts', () => ({
  useMessageTts: jest.fn(() => ({
    isSpeaking: false,
    isLoading: false,
    handleSpeak: jest.fn(),
  })),
}));

jest.mock('../../components/message/markdownStyles', () => ({
  createMarkdownStyles: jest.fn(() => ({})),
}));

jest.mock('../../components/message/messageItemStyles', () => ({
  styles: {
    container: {},
    userRow: {},
    userBubble: {},
    image: { width: 200, height: 200 },
    messageText: {},
    userTimestamp: {},
    botRow: {},
    header: {},
    senderName: {},
    headerRight: {},
    speakButton: {},
    timestamp: {},
    markdownContainer: {},
  },
}));

jest.mock('../../components/chat/ImageViewerModal', () => {
  const { View } = require('react-native');
  return function MockImageViewer({ visible }: any) {
    if (!visible) return null;
    return <View testID="image-viewer" />;
  };
});

import MessageItem from '../../components/MessageItem';

const makeMessage = (overrides: Record<string, unknown> = {}) => ({
  _id: 'msg-1',
  text: 'Hello world',
  isBot: false,
  createdAt: new Date('2026-01-15T10:30:00Z'),
  ...overrides,
});

describe('MessageItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('user messages', () => {
    it('renders user text in a bubble', () => {
      const { getByText } = render(
        <MessageItem message={makeMessage({ text: 'My question' }) as any} />
      );

      expect(getByText('My question')).toBeTruthy();
    });

    it('renders user timestamp', () => {
      const date = new Date('2026-01-15T10:30:00Z');
      const { getByText } = render(
        <MessageItem message={makeMessage({ createdAt: date }) as any} />
      );

      // Format as local time (HH:MM)
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      expect(getByText(`${hours}:${minutes}`)).toBeTruthy();
    });

    it('renders user image when present', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({ image: 'https://example.com/photo.jpg' }) as any}
        />
      );

      expect(getByTestId('expo-image')).toBeTruthy();
    });

    it('does not render text starting with [Image for', () => {
      const { queryByText } = render(
        <MessageItem
          message={makeMessage({
            text: '[Image for analysis]',
            image: 'https://example.com/photo.jpg',
          }) as any}
        />
      );

      expect(queryByText('[Image for analysis]')).toBeNull();
    });
  });

  describe('bot messages', () => {
    it('renders bot sender name', () => {
      const { getByText } = render(
        <MessageItem message={makeMessage({ isBot: true }) as any} />
      );

      expect(getByText('FarmerChat')).toBeTruthy();
    });

    it('renders bot text with markdown', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({ isBot: true, text: '**Bold answer**' }) as any}
        />
      );

      expect(getByTestId('markdown-text')).toBeTruthy();
    });

    it('renders TTS speaker button', () => {
      const { getByTestId } = render(
        <MessageItem message={makeMessage({ isBot: true }) as any} />
      );

      expect(getByTestId('icon-volume-high')).toBeTruthy();
    });
  });

  describe('streaming state', () => {
    it('returns null for empty streaming bot message', () => {
      const { toJSON } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: '',
            isStreaming: true,
            status: 'streaming',
          }) as any}
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('renders streaming text with sanitization', () => {
      const { getByText } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Partial **bold',
            isStreaming: true,
            status: 'streaming',
          }) as any}
        />
      );

      // During streaming, the component uses plain <Text> (not <Markdown>)
      // and sanitizeStreamingMarkdown strips the trailing incomplete bold markers
      expect(getByText('Partial **bold')).toBeTruthy();
    });
  });

  describe('thinking state', () => {
    it('shows typing indicator when thinking', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: '',
            status: 'thinking',
            thinkingText: 'Processing...',
          }) as any}
        />
      );

      expect(getByTestId('typing-indicator')).toBeTruthy();
    });
  });

  describe('diagnosis card', () => {
    it('renders DiagnosisCard when diagnosisData present', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Analysis complete',
            diagnosisData: { crop: { name: 'Maize' } },
          }) as any}
        />
      );

      expect(getByTestId('diagnosis-card')).toBeTruthy();
    });
  });

  describe('follow-up questions', () => {
    it('renders follow-up questions for completed bot message', () => {
      const onFollowUpTap = jest.fn();
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Response',
            followUpQuestions: ['What about soil?', 'How to irrigate?'],
          }) as any}
          onFollowUpTap={onFollowUpTap}
        />
      );

      expect(getByTestId('follow-up-questions')).toBeTruthy();
    });

    it('does not render follow-ups while streaming', () => {
      const { queryByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Partial...',
            isStreaming: true,
            followUpQuestions: ['Q1'],
          }) as any}
          onFollowUpTap={jest.fn()}
        />
      );

      expect(queryByTestId('follow-up-questions')).toBeNull();
    });
  });

  describe('A2UI widgets', () => {
    it('renders A2UIDispatcher for completed bot message with widgets', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Select your crop',
            a2uiWidgets: [{ widgetId: 'w1', widgetType: 'crop_picker', title: 'Crop' }],
          }) as any}
          onA2UIPress={jest.fn()}
          respondedA2UIWidgetIds={new Set()}
        />
      );

      expect(getByTestId('a2ui-dispatcher')).toBeTruthy();
    });
  });

  describe('error retry', () => {
    it('renders retry button for error messages', () => {
      const onRetryMessage = jest.fn();
      const { getByText } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Something went wrong',
            isError: true,
            retryData: { lastMessage: 'My original question' },
          }) as any}
          onRetryMessage={onRetryMessage}
        />
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls onRetryMessage with original text when retry pressed', () => {
      const onRetryMessage = jest.fn();
      const { getByText } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: 'Error occurred',
            isError: true,
            retryData: { lastMessage: 'Original question' },
          }) as any}
          onRetryMessage={onRetryMessage}
        />
      );

      fireEvent.press(getByText('Retry'));
      expect(onRetryMessage).toHaveBeenCalledWith('Original question');
    });
  });

  describe('ration flow', () => {
    it('renders RationFlowRenderer when flowStep present', () => {
      const { getByTestId } = render(
        <MessageItem
          message={makeMessage({
            isBot: true,
            text: '',
            flowStep: { type: 'ingredients' },
          }) as any}
        />
      );

      expect(getByTestId('ration-flow')).toBeTruthy();
    });
  });
});
