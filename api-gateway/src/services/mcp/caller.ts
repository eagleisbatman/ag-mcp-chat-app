/**
 * MCP Caller Service
 * Handles calling MCP server tools via JSON-RPC
 */

import { McpToolCallResult, McpCallOptions } from '../../types';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Call an MCP server tool
 * Uses JSON-RPC 2.0 protocol with SSE response parsing
 */
export async function callMcpTool(
  options: McpCallOptions
): Promise<McpToolCallResult> {
  const { endpoint, toolName, args, extraHeaders = {}, timeout = DEFAULT_TIMEOUT } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${endpoint}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...extraHeaders,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();

    // Parse SSE response
    const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
    if (dataLine) {
      const data = JSON.parse(dataLine.replace('data: ', ''));

      if (data.result?.content?.[0]?.text) {
        try {
          return {
            success: true,
            data: JSON.parse(data.result.content[0].text),
          };
        } catch {
          return {
            success: true,
            data: data.result.content[0].text,
          };
        }
      }
    }

    // Try parsing as plain JSON
    try {
      const jsonData = JSON.parse(text);
      if (jsonData.result) {
        return { success: true, data: jsonData.result };
      }
      if (jsonData.error) {
        return { success: false, error: jsonData.error.message || 'MCP error' };
      }
    } catch {
      // Not JSON
    }

    return { success: false, error: 'No data in response' };
  } catch (error) {
    const err = error as Error;

    if (err.name === 'AbortError') {
      console.error(`[MCP] Timeout calling ${toolName} after ${timeout}ms`);
      return { success: false, error: 'Request timed out' };
    }

    console.error(`[MCP] Error calling ${toolName}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Simple wrapper for common MCP calls
 * Overloaded to accept either options object or positional arguments
 */
export async function callTool(
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<unknown> {
  const result = await callMcpTool({ endpoint, toolName, args, extraHeaders });
  return result.success ? result.data : { error: result.error };
}

/**
 * Check if a result is an error or has no useful data
 */
export function isErrorOrNoData(result: unknown): boolean {
  if (!result) return true;
  if (typeof result !== 'object') return false;

  const obj = result as Record<string, unknown>;
  if (obj.error) return true;
  if (obj.success === false) return true;

  return false;
}
