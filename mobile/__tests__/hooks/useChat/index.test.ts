/**
 * Tests for hooks/useChat/index.ts (the main composition hook)
 * Covers: composition of sub-hooks, return shape, session creation,
 * message management, send delegation.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock all sub-hooks
jest.mock('../../../hooks/useChat/useChatSession', () => {
  return jest.fn(() => ({
    messages: [{ _id: 'welcome', text: 'Welcome!', isBot: true, createdAt: new Date() }],
    setMessages: jest.fn(),
    isLoadingSession: false,
    titleGeneratedRef: { current: false },
    startNewSession: jest.fn(),
    ensureSession: jest.fn().mockResolvedValue('session-123'),
    maybeGenerateTitle: jest.fn(),
  }));
});

jest.mock('../../../hooks/useChat/useChatMessages', () => {
  return jest.fn(() => ({
    newestBotMessageId: null,
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    persistMessage: jest.fn(),
  }));
});

jest.mock('../../../hooks/useChat/useChatSend', () => {
  return jest.fn(() => ({
    isTyping: false,
    thinkingText: null,
    handleSendText: jest.fn(),
    handleSendImage: jest.fn(),
    transcribeAudioForInput: jest.fn(),
    uploadAudioInBackground: jest.fn(),
    abortStreaming: jest.fn(),
  }));
});

import useChat from '../../../hooks/useChat/index';
import useChatSession from '../../../hooks/useChat/useChatSession';
import useChatMessages from '../../../hooks/useChat/useChatMessages';
import useChatSend from '../../../hooks/useChat/useChatSend';

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all expected fields', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('isTyping');
    expect(result.current).toHaveProperty('isLoadingSession');
    expect(result.current).toHaveProperty('newestBotMessageId');
    expect(result.current).toHaveProperty('thinkingText');
    expect(result.current).toHaveProperty('handleSendText');
    expect(result.current).toHaveProperty('handleSendImage');
    expect(result.current).toHaveProperty('transcribeAudioForInput');
    expect(result.current).toHaveProperty('uploadAudioInBackground');
    expect(result.current).toHaveProperty('startNewSession');
    expect(result.current).toHaveProperty('abortStreaming');
  });

  it('passes sessionIdParam to useChatSession', () => {
    renderHook(() => useChat('session-abc'));
    expect(useChatSession).toHaveBeenCalledWith('session-abc');
  });

  it('passes null sessionIdParam by default', () => {
    renderHook(() => useChat());
    expect(useChatSession).toHaveBeenCalledWith(null);
  });

  it('passes messages and setMessages to useChatMessages', () => {
    renderHook(() => useChat());
    expect(useChatMessages).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function)
    );
  });

  it('passes dependencies to useChatSend', () => {
    renderHook(() => useChat(null, 'farmer-user-123'));
    expect(useChatSend).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.any(Array),
        addMessage: expect.any(Function),
        updateMessage: expect.any(Function),
        ensureSession: expect.any(Function),
        persistMessage: expect.any(Function),
        maybeGenerateTitle: expect.any(Function),
        onBehalfOfFarmerUserId: 'farmer-user-123',
      })
    );
  });

  it('returns messages from useChatSession', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: 'welcome' }),
      ])
    );
  });

  it('returns isTyping from useChatSend', () => {
    (useChatSend as jest.Mock).mockReturnValue({
      isTyping: true,
      thinkingText: 'Thinking...',
      handleSendText: jest.fn(),
      handleSendImage: jest.fn(),
      transcribeAudioForInput: jest.fn(),
      uploadAudioInBackground: jest.fn(),
      abortStreaming: jest.fn(),
    });

    const { result } = renderHook(() => useChat());
    expect(result.current.isTyping).toBe(true);
    expect(result.current.thinkingText).toBe('Thinking...');
  });

  it('returns newestBotMessageId from useChatMessages', () => {
    (useChatMessages as jest.Mock).mockReturnValue({
      newestBotMessageId: 'bot-msg-1',
      addMessage: jest.fn(),
      updateMessage: jest.fn(),
      persistMessage: jest.fn(),
    });

    const { result } = renderHook(() => useChat());
    expect(result.current.newestBotMessageId).toBe('bot-msg-1');
  });

  it('returns isLoadingSession from useChatSession', () => {
    (useChatSession as jest.Mock).mockReturnValue({
      messages: [],
      setMessages: jest.fn(),
      isLoadingSession: true,
      titleGeneratedRef: { current: false },
      startNewSession: jest.fn(),
      ensureSession: jest.fn(),
      maybeGenerateTitle: jest.fn(),
    });

    const { result } = renderHook(() => useChat());
    expect(result.current.isLoadingSession).toBe(true);
  });

  it('delegates startNewSession to useChatSession', () => {
    const mockStartNew = jest.fn();
    (useChatSession as jest.Mock).mockReturnValue({
      messages: [],
      setMessages: jest.fn(),
      isLoadingSession: false,
      titleGeneratedRef: { current: false },
      startNewSession: mockStartNew,
      ensureSession: jest.fn(),
      maybeGenerateTitle: jest.fn(),
    });

    const { result } = renderHook(() => useChat());
    result.current.startNewSession();
    expect(mockStartNew).toHaveBeenCalledTimes(1);
  });

  it('delegates abortStreaming to useChatSend', () => {
    const mockAbort = jest.fn();
    (useChatSend as jest.Mock).mockReturnValue({
      isTyping: false,
      thinkingText: null,
      handleSendText: jest.fn(),
      handleSendImage: jest.fn(),
      transcribeAudioForInput: jest.fn(),
      uploadAudioInBackground: jest.fn(),
      abortStreaming: mockAbort,
    });

    const { result } = renderHook(() => useChat());
    result.current.abortStreaming();
    expect(mockAbort).toHaveBeenCalledTimes(1);
  });
});
