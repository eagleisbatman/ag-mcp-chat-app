/**
 * Tests for useChatMessages hook
 * Covers: addMessage, updateMessage (including function updates),
 * persistMessage, persistUpdate, newestBotMessageId.
 */

import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('../../../contexts/AppContext', () => ({
  useApp: jest.fn(() => ({
    language: { code: 'en' },
    isDbSynced: true,
  })),
}));

jest.mock('../../../services/db', () => ({
  saveMessage: jest.fn(),
  updateMessage: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import useChatMessages from '../../../hooks/useChat/useChatMessages';
import { saveMessage, updateMessage as updateDbMessage } from '../../../services/db';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../../contexts/AppContext';
import { Message } from '../../../types';

describe('useChatMessages', () => {
  let messages: Message[];
  let setMessages: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    messages = [];
    setMessages = jest.fn((updater) => {
      if (typeof updater === 'function') {
        messages = updater(messages);
      } else {
        messages = updater;
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addMessage', () => {
    it('prepends message to array', () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      const msg: Message = { _id: 'msg-1', text: 'Hello', createdAt: new Date(), isBot: false };
      act(() => {
        result.current.addMessage(msg);
      });

      expect(setMessages).toHaveBeenCalled();
      expect(messages).toHaveLength(1);
      expect(messages[0]._id).toBe('msg-1');
    });

    it('sets newestBotMessageId for bot messages and triggers haptics', () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      const botMsg: Message = { _id: 'bot-1', text: 'Hi!', createdAt: new Date(), isBot: true };
      act(() => {
        result.current.addMessage(botMsg);
      });

      expect(result.current.newestBotMessageId).toBe('bot-1');
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });

    it('clears newestBotMessageId after 8 seconds', () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      const botMsg: Message = { _id: 'bot-2', text: 'Hi!', createdAt: new Date(), isBot: true };
      act(() => {
        result.current.addMessage(botMsg);
      });

      expect(result.current.newestBotMessageId).toBe('bot-2');

      act(() => {
        jest.advanceTimersByTime(8001);
      });

      expect(result.current.newestBotMessageId).toBeNull();
    });

    it('does not set newestBotMessageId for user messages', () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      const userMsg: Message = { _id: 'u-1', text: 'Hey', createdAt: new Date(), isBot: false };
      act(() => {
        result.current.addMessage(userMsg);
      });

      expect(result.current.newestBotMessageId).toBeNull();
    });
  });

  describe('updateMessage', () => {
    it('updates message text directly', () => {
      messages = [{ _id: 'msg-1', text: 'old', createdAt: new Date(), isBot: true }];
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      act(() => {
        result.current.updateMessage('msg-1', { text: 'new text' });
      });

      expect(setMessages).toHaveBeenCalled();
      const updated = messages.find((m: Message) => m._id === 'msg-1');
      expect(updated?.text).toBe('new text');
    });

    it('supports function-style text updates', () => {
      messages = [{ _id: 'msg-1', text: 'Hello', createdAt: new Date(), isBot: true }];
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      act(() => {
        result.current.updateMessage('msg-1', {
          text: ((prev: string) => prev + ' World') as any,
        });
      });

      const updated = messages.find((m: Message) => m._id === 'msg-1');
      expect(updated?.text).toBe('Hello World');
    });

    it('ignores messages with non-matching id', () => {
      messages = [{ _id: 'msg-1', text: 'keep', createdAt: new Date(), isBot: true }];
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      act(() => {
        result.current.updateMessage('msg-999', { text: 'change' });
      });

      const msg = messages.find((m: Message) => m._id === 'msg-1');
      expect(msg?.text).toBe('keep');
    });
  });

  describe('persistMessage', () => {
    it('saves message to DB when synced', async () => {
      (saveMessage as jest.Mock).mockResolvedValue({
        success: true,
        message: { id: 'db-msg-1' },
      });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      const msg: Message & { cloudinaryUrl?: string } = {
        _id: 'local-1',
        text: 'Test',
        createdAt: new Date(),
        isBot: false,
      };

      let dbId: string | null = null;
      await act(async () => {
        dbId = await result.current.persistMessage(msg, 'session-1');
      });

      expect(dbId).toBe('db-msg-1');
      expect(saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          role: 'user',
          content: 'Test',
        })
      );
    });

    it('returns null when not synced', async () => {
      (useApp as jest.Mock).mockReturnValue({ language: { code: 'en' }, isDbSynced: false });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      let dbId: string | null = 'not-null';
      await act(async () => {
        dbId = await result.current.persistMessage(
          { _id: '1', text: 'x', createdAt: new Date(), isBot: false },
          'session-1'
        );
      });

      expect(dbId).toBeNull();
      expect(saveMessage).not.toHaveBeenCalled();

      // Reset mock
      (useApp as jest.Mock).mockReturnValue({ language: { code: 'en' }, isDbSynced: true });
    });

    it('returns null when sessionId is null', async () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      let dbId: string | null = 'not-null';
      await act(async () => {
        dbId = await result.current.persistMessage(
          { _id: '1', text: 'x', createdAt: new Date(), isBot: false },
          null
        );
      });

      expect(dbId).toBeNull();
    });

    it('returns null and logs on DB error', async () => {
      (saveMessage as jest.Mock).mockRejectedValue(new Error('DB down'));

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      let dbId: string | null = 'not-null';
      await act(async () => {
        dbId = await result.current.persistMessage(
          { _id: '1', text: 'x', createdAt: new Date(), isBot: false },
          'session-1'
        );
      });

      expect(dbId).toBeNull();
    });

    it('sets role to assistant for bot messages', async () => {
      (saveMessage as jest.Mock).mockResolvedValue({ success: true, message: { id: 'b1' } });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      await act(async () => {
        await result.current.persistMessage(
          { _id: '1', text: 'Bot reply', createdAt: new Date(), isBot: true },
          'session-1'
        );
      });

      expect(saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'assistant' })
      );
    });

    it('sets contentType to image when message has image', async () => {
      (saveMessage as jest.Mock).mockResolvedValue({ success: true, message: { id: 'i1' } });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      await act(async () => {
        await result.current.persistMessage(
          { _id: '1', text: 'Photo', createdAt: new Date(), isBot: false, image: 'file://img.jpg' },
          'session-1'
        );
      });

      expect(saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image' })
      );
    });
  });

  describe('persistUpdate', () => {
    it('calls updateMessage on DB', async () => {
      (updateDbMessage as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      await act(async () => {
        await result.current.persistUpdate('msg-1', { feedback: 'positive' });
      });

      expect(updateDbMessage).toHaveBeenCalledWith('msg-1', { feedback: 'positive' });
    });

    it('skips when not synced', async () => {
      (useApp as jest.Mock).mockReturnValue({ language: { code: 'en' }, isDbSynced: false });

      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      await act(async () => {
        await result.current.persistUpdate('msg-1', { feedback: 'positive' });
      });

      expect(updateDbMessage).not.toHaveBeenCalled();

      (useApp as jest.Mock).mockReturnValue({ language: { code: 'en' }, isDbSynced: true });
    });

    it('skips when messageId is empty', async () => {
      const { result } = renderHook(() => useChatMessages(messages, setMessages));

      await act(async () => {
        await result.current.persistUpdate('', { feedback: 'positive' });
      });

      expect(updateDbMessage).not.toHaveBeenCalled();
    });
  });
});
