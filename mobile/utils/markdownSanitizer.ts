/**
 * Markdown sanitization utilities
 * Handles incomplete markdown during streaming
 */

/**
 * Sanitize streaming text to prevent partial markdown from rendering incorrectly
 * During streaming, incomplete markdown syntax like `**bo` shows raw characters
 * This function trims incomplete patterns from the end of streaming text
 * @param text - Potentially incomplete markdown text
 * @returns Sanitized text safe for rendering
 */
export function sanitizeStreamingMarkdown(text: string | null | undefined): string {
  if (!text) return text || '';

  let result = text;

  // Patterns that indicate incomplete markdown at the end of text
  // We check if the text ends with an unclosed pattern and trim it

  // Count open/close markers
  const starCount = (result.match(/\*+$/g) || [''])[0].length;

  // If ends with odd number of asterisks (incomplete bold/italic), remove them
  if (starCount > 0 && starCount < 4) {
    // Check if this is unclosed by counting pairs
    const openBold = (result.match(/\*\*(?!\s)/g) || []).length;
    const closeBold = (result.match(/(?<!\s)\*\*/g) || []).length;
    const openItalic = (result.match(/(?<!\*)\*(?!\*|\s)/g) || []).length;
    const closeItalic = (result.match(/(?<!\s|\*)\*(?!\*)/g) || []).length;

    // Simple heuristic: if ends with stars and they seem unclosed
    if (openBold !== closeBold || openItalic !== closeItalic) {
      result = result.replace(/\*+$/, '');
    }
  }

  // Remove trailing incomplete link/image syntax
  result = result.replace(/\[([^\]]*)?$/, ''); // Unclosed [
  result = result.replace(/\]\([^)]*$/, '');   // Unclosed (

  // Remove trailing incomplete code blocks
  result = result.replace(/`+$/, '');

  // Remove trailing incomplete headers that have just started
  result = result.replace(/\n#{1,6}\s*$/, '\n');

  return result;
}

/**
 * Check if text has incomplete markdown syntax
 * @param text - Text to check
 * @returns True if text has incomplete markdown
 */
export function hasIncompleteMarkdown(text: string): boolean {
  if (!text) return false;

  // Check for unclosed patterns
  const patterns = [
    /\*+$/,           // Trailing asterisks
    /\[([^\]]*)?$/,   // Unclosed [
    /\]\([^)]*$/,     // Unclosed (
    /`+$/,            // Trailing backticks
    /\n#{1,6}\s*$/,   // Incomplete headers
  ];

  return patterns.some(pattern => pattern.test(text));
}

export default {
  sanitizeStreamingMarkdown,
  hasIncompleteMarkdown,
};
