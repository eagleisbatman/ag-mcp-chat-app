// Tests for chatStreaming service
//
// XMLHttpRequest is mocked globally since the streaming chat uses XHR directly
// (not fetch) for progressive reading of SSE chunks.

// Mock logger
jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock the core api module
jest.mock('../../services/api/core', () => ({
  API_KEY: 'test-api-key',
  CHAT_API_URL: 'https://api.example.com/api/chat',
  CHAT_TIMEOUT_MS: 60000,
  FALLBACK_LATITUDE: -1.2864,
  FALLBACK_LONGITUDE: 36.8172,
  buildLocationContext: jest.fn(() => null),
  ensureDeviceId: jest.fn(() => Promise.resolve('test-device-id')),
  getLocalDateTime: jest.fn(() => ({
    isoDateTime: '2026-03-01T12:00:00.000Z',
    localDateTime: 'Sun Mar 01 2026 12:00:00',
    year: 2026,
    month: 3,
    day: 1,
    hour: 12,
    minute: 0,
    timezone: 'Africa/Nairobi',
    utcOffset: '+03:00',
  })),
}));

// ---------------------------------------------------------------------------
// Minimal XMLHttpRequest mock
// ---------------------------------------------------------------------------
class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  // Standard XHR properties
  readyState = 0;
  status = 0;
  responseText = '';
  timeout = 0;

  // Event handlers
  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  // Recorded calls
  openArgs: unknown[] = [];
  headers: Record<string, string> = {};
  sentBody: string | null = null;
  abortCalled = false;

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  open(...args: unknown[]): void {
    this.openArgs = args;
  }

  setRequestHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  send(body?: string): void {
    this.sentBody = body ?? null;
  }

  abort(): void {
    this.abortCalled = true;
    this.onabort?.();
  }

  // --- Test helpers ---

  /** Simulate receiving additional response text (SSE chunks). */
  simulateProgress(additionalText: string): void {
    this.responseText += additionalText;
    this.onprogress?.();
  }

  /** Simulate successful load. */
  simulateLoad(statusCode = 200): void {
    this.status = statusCode;
    this.onload?.();
  }

  /** Simulate network error. */
  simulateError(): void {
    this.onerror?.();
  }

  /** Simulate timeout. */
  simulateTimeout(): void {
    this.ontimeout?.();
  }

  static reset(): void {
    MockXMLHttpRequest.instances = [];
  }

  static get latest(): MockXMLHttpRequest {
    return MockXMLHttpRequest.instances[MockXMLHttpRequest.instances.length - 1];
  }
}

// Install the mock globally
(globalThis as unknown as Record<string, unknown>).XMLHttpRequest = MockXMLHttpRequest;

// Import AFTER mocks are installed
import { sendChatMessageStreaming } from '../../services/api/chatStreaming';

describe('chatStreaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockXMLHttpRequest.reset();
  });

  // Helper to create a streaming call with sensible defaults
  function startStream(overrides: Record<string, unknown> = {}) {
    const onChunk = jest.fn();
    const onThinking = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();
    const onA2UI = jest.fn();
    const onFlowStep = jest.fn();

    const result = sendChatMessageStreaming({
      message: 'Hello',
      language: 'en',
      onChunk,
      onThinking,
      onComplete,
      onError,
      onA2UI,
      onFlowStep,
      ...overrides,
    });

    return { ...result, onChunk, onThinking, onComplete, onError, onA2UI, onFlowStep };
  }

  // We need to wait a tick for the async IIFE inside sendChatMessageStreaming
  // to reach the XHR creation point (after awaiting ensureDeviceId).
  async function waitForXhr(): Promise<MockXMLHttpRequest> {
    // Allow microtasks to settle so the async IIFE reaches xhr.send()
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    return MockXMLHttpRequest.latest;
  }

  describe('request setup', () => {
    it('opens a POST to the correct URL with correct headers', async () => {
      startStream();
      const xhr = await waitForXhr();

      expect(xhr.openArgs[0]).toBe('POST');
      expect(xhr.openArgs[1]).toBe('https://api.example.com/api/chat');
      expect(xhr.headers['Content-Type']).toBe('application/json');
      expect(xhr.headers['X-API-Key']).toBe('test-api-key');
      expect(xhr.headers['Accept']).toBe('text/event-stream');
    });

    it('includes message, language, stream flag and deviceId in request body', async () => {
      startStream({ message: 'What crops to grow?', language: 'sw' });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body.message).toBe('What crops to grow?');
      expect(body.language).toBe('sw');
      expect(body.stream).toBe(true);
      expect(body.deviceId).toBe('test-device-id');
    });

    it('sets timeout from CHAT_TIMEOUT_MS', async () => {
      startStream();
      const xhr = await waitForXhr();
      expect(xhr.timeout).toBe(60000);
    });

    it('uses fallback coordinates when none provided', async () => {
      startStream({ latitude: undefined, longitude: undefined });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body.latitude).toBe(-1.2864);
      expect(body.longitude).toBe(36.8172);
    });

    it('uses provided coordinates when available', async () => {
      startStream({ latitude: 9.03, longitude: 38.74 });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body.latitude).toBe(9.03);
      expect(body.longitude).toBe(38.74);
    });
  });

  describe('SSE stream parsing', () => {
    it('calls onChunk for text events', async () => {
      const { onChunk } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"text","text":"Hello "}\n\n');
      xhr.simulateProgress('data: {"type":"text","text":"farmer!"}\n\n');

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenCalledWith('Hello ');
      expect(onChunk).toHaveBeenCalledWith('farmer!');
    });

    it('calls onThinking for thinking events', async () => {
      const { onThinking } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"thinking","thinking":"Analyzing weather data..."}\n\n');

      expect(onThinking).toHaveBeenCalledWith('Analyzing weather data...');
    });

    it('calls onComplete with full text on [DONE]', async () => {
      const { onComplete, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"text","text":"Full response here."}\n\n');
      xhr.simulateProgress('data: [DONE]\n\n');

      const result = await promise;
      expect(result.success).toBe(true);
      expect(onComplete).toHaveBeenCalledWith('Full response here.', expect.any(Object));
    });

    it('calls onError for error events', async () => {
      const { onError, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"error","error":"Server overloaded"}\n\n');

      // Need to also close the connection
      xhr.simulateLoad(200);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Server overloaded');
      expect(onError).toHaveBeenCalled();
    });

    it('calls onA2UI for a2ui events', async () => {
      const { onA2UI } = startStream();
      const xhr = await waitForXhr();

      const a2uiPayload = {
        widgetId: 'w1',
        widgetType: 'crop_picker',
        title: 'Select crop',
      };
      xhr.simulateProgress(
        `data: {"type":"a2ui","a2ui":${JSON.stringify(a2uiPayload)}}\n\n`
      );

      expect(onA2UI).toHaveBeenCalledWith(expect.objectContaining({
        widgetId: 'w1',
        widgetType: 'crop_picker',
      }));
    });

    it('calls onFlowStep for flow_step events', async () => {
      const { onFlowStep } = startStream();
      const xhr = await waitForXhr();

      const flowStep = { step: 'select_cow', messageKey: 'ration.select_cow', data: { cows: [] } };
      xhr.simulateProgress(
        `data: {"type":"flow_step","flowStep":${JSON.stringify(flowStep)}}\n\n`
      );

      expect(onFlowStep).toHaveBeenCalledWith(expect.objectContaining({
        step: 'select_cow',
        messageKey: 'ration.select_cow',
      }));
    });

    it('extracts followUpQuestions from complete event', async () => {
      const { onComplete, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress(
        'data: {"type":"complete","response":"Answer here","followUpQuestions":["Q1","Q2"]}\n\n'
      );
      xhr.simulateProgress('data: [DONE]\n\n');

      await promise;
      expect(onComplete).toHaveBeenCalledWith(
        'Answer here',
        expect.objectContaining({ followUpQuestions: ['Q1', 'Q2'] }),
      );
    });

    it('skips partial/invalid JSON gracefully', async () => {
      const { onChunk } = startStream();
      const xhr = await waitForXhr();

      // Invalid JSON line — should not throw
      xhr.simulateProgress('data: {invalid json\n\n');
      // Valid line after
      xhr.simulateProgress('data: {"type":"text","text":"ok"}\n\n');

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith('ok');
    });

    it('buffers incomplete lines across chunks', async () => {
      const { onChunk } = startStream();
      const xhr = await waitForXhr();

      // First chunk: partial line (no newline)
      xhr.simulateProgress('data: {"type":"text","text":"hel');
      // Second chunk: rest of line + newline
      xhr.simulateProgress('lo"}\n\n');

      expect(onChunk).toHaveBeenCalledWith('hello');
    });
  });

  describe('[FOLLOWUP] tag filtering', () => {
    it('strips [FOLLOWUP]...[/FOLLOWUP] from displayed text', async () => {
      const { onChunk } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress(
        'data: {"type":"text","text":"Visible text [FOLLOWUP]hidden[/FOLLOWUP] more visible"}\n\n'
      );

      // onChunk should receive only the visible portions
      const received = onChunk.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(received).not.toContain('[FOLLOWUP]');
      expect(received).not.toContain('hidden');
      expect(received).toContain('Visible text');
      expect(received).toContain('more visible');
    });

    it('handles [FOLLOWUP] tags split across multiple chunks', async () => {
      const { onChunk } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"text","text":"Before [FOLLOWUP"}\n\n');
      xhr.simulateProgress('data: {"type":"text","text":"]hidden content[/FOLLOWUP] After"}\n\n');

      const received = onChunk.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(received).toContain('Before');
      expect(received).toContain('After');
      expect(received).not.toContain('hidden content');
    });
  });

  describe('abort', () => {
    it('abort() calls xhr.abort()', async () => {
      const { abort } = startStream();
      const xhr = await waitForXhr();

      abort();

      expect(xhr.abortCalled).toBe(true);
    });

    it('abort() before XHR creation causes early return', async () => {
      const { abort, promise } = startStream();

      // Call abort immediately (before async IIFE creates XHR)
      abort();

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Aborted');
    });

    it('onComplete is called with partial text on abort', async () => {
      const { abort, onComplete, promise } = startStream();
      const xhr = await waitForXhr();

      // Receive some text
      xhr.simulateProgress('data: {"type":"text","text":"Partial response"}\n\n');

      // Abort mid-stream
      abort();

      const result = await promise;
      expect(result.success).toBe(true);
      expect(onComplete).toHaveBeenCalledWith('Partial response', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('calls onError on network failure', async () => {
      const { onError, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateError();

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network request failed');
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network request failed' }));
    });

    it('calls onError on timeout', async () => {
      const { onError, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateTimeout();

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Request timeout' }));
    });

    it('calls onError on non-2xx status', async () => {
      const { onError, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateLoad(500);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('API error: 500');
      expect(onError).toHaveBeenCalled();
    });

    it('resolves successfully on 200 load even without [DONE]', async () => {
      const { onComplete, promise } = startStream();
      const xhr = await waitForXhr();

      xhr.simulateProgress('data: {"type":"text","text":"Some text"}\n\n');
      xhr.simulateLoad(200);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(onComplete).toHaveBeenCalledWith('Some text', expect.any(Object));
    });
  });

  describe('history formatting', () => {
    it('filters welcome messages and limits to 10 most recent', async () => {
      const history = [
        { _id: 'welcome', text: 'Welcome!', isBot: true },
        ...Array.from({ length: 15 }, (_, i) => ({
          _id: `msg-${i}`,
          text: `Message ${i}`,
          isBot: i % 2 === 0,
        })),
      ];

      startStream({ history });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      // Welcome message filtered out, then sliced to 10, then reversed
      expect(body.history.length).toBeLessThanOrEqual(10);
      expect(body.history.every((m: { text: string }) => m.text !== 'Welcome!')).toBe(true);
    });

    it('filters messages with null text', async () => {
      const history = [
        { _id: 'msg-1', text: 'Valid', isBot: false },
        { _id: 'msg-2', text: null, isBot: true },
        { _id: 'msg-3', text: '', isBot: false },
      ];

      startStream({ history });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      // null text filtered out, empty string filtered out
      expect(body.history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('optional parameters', () => {
    it('includes sessionId when provided', async () => {
      startStream({ sessionId: 'session-abc' });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body.sessionId).toBe('session-abc');
    });

    it('includes onBehalfOfFarmerUserId when provided', async () => {
      startStream({ onBehalfOfFarmerUserId: 'farmer-xyz' });
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body.onBehalfOfFarmerUserId).toBe('farmer-xyz');
    });

    it('omits onBehalfOfFarmerUserId when not provided', async () => {
      startStream();
      const xhr = await waitForXhr();

      const body = JSON.parse(xhr.sentBody!);
      expect(body).not.toHaveProperty('onBehalfOfFarmerUserId');
    });
  });
});
