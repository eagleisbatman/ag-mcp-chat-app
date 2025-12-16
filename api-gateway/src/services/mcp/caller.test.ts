/**
 * MCP Caller Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callTool, callMcpTool, isErrorOrNoData } from './caller';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MCP Caller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isErrorOrNoData', () => {
    it('should return true for null', () => {
      expect(isErrorOrNoData(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isErrorOrNoData(undefined)).toBe(true);
    });

    it('should return true for error object', () => {
      expect(isErrorOrNoData({ error: 'Something went wrong' })).toBe(true);
    });

    it('should return true for success:false object', () => {
      expect(isErrorOrNoData({ success: false })).toBe(true);
    });

    it('should return false for valid data object', () => {
      expect(isErrorOrNoData({ temperature: 25 })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isErrorOrNoData([1, 2, 3])).toBe(false);
    });

    it('should return false for string', () => {
      expect(isErrorOrNoData('valid data')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isErrorOrNoData(42)).toBe(false);
    });
  });

  describe('callMcpTool', () => {
    it('should call MCP endpoint and return parsed SSE response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(
          'data: {"result":{"content":[{"type":"text","text":"{\\"temp\\":25}"}]}}\n'
        ),
      });

      const result = await callMcpTool({
        endpoint: 'https://mcp.example.com',
        toolName: 'get_weather',
        args: { latitude: 9.0, longitude: 38.7 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ temp: 25 });
    });

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('data: {"result":{"content":[]}}\n'),
      });

      await callMcpTool({
        endpoint: 'https://mcp.example.com',
        toolName: 'get_data',
        args: {},
        extraHeaders: { 'X-Custom-Header': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });

    it('should return error on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await callMcpTool({
        endpoint: 'https://mcp.example.com',
        toolName: 'get_data',
        args: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send correct JSON-RPC body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('data: {"result":{"content":[]}}\n'),
      });

      await callMcpTool({
        endpoint: 'https://mcp.example.com',
        toolName: 'test_tool',
        args: { param1: 'value1' },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toMatchObject({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { param1: 'value1' },
        },
      });
    });

    it('should handle non-JSON text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(
          'data: {"result":{"content":[{"type":"text","text":"Plain text response"}]}}\n'
        ),
      });

      const result = await callMcpTool({
        endpoint: 'https://mcp.example.com',
        toolName: 'get_data',
        args: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('Plain text response');
    });
  });

  describe('callTool', () => {
    it('should return data on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(
          'data: {"result":{"content":[{"type":"text","text":"{\\"value\\":123}"}]}}\n'
        ),
      });

      const result = await callTool(
        'https://mcp.example.com',
        'get_value',
        { id: 1 }
      );

      expect(result).toEqual({ value: 123 });
    });

    it('should return error object on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await callTool(
        'https://mcp.example.com',
        'get_data',
        {}
      );

      expect(result).toEqual({ error: 'Connection failed' });
    });

    it('should pass extra headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('data: {"result":{"content":[]}}\n'),
      });

      await callTool(
        'https://mcp.example.com',
        'get_data',
        {},
        { 'X-Farm-Id': '123' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Farm-Id': '123',
          }),
        })
      );
    });
  });
});
