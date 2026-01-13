/**
 * Message content renderer
 * Handles markdown text, images, and special content types
 */
import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Markdown from 'react-native-markdown-display';
import { Image } from 'expo-image';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import { sanitizeStreamingMarkdown } from '../../utils/markdownSanitizer';

function MessageContent({
  text,
  image,
  isBot,
  isStreaming,
  maxWidth,
}) {
  const { theme } = useApp();
  const textColor = theme.text;

  // Markdown styles
  const markdownStyles = useMemo(() => ({
    body: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.base,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    },
    heading1: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.xl,
      fontWeight: TYPOGRAPHY.weights.bold,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading2: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.lg,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    heading3: {
      color: textColor,
      fontSize: TYPOGRAPHY.sizes.md,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginBottom: SPACING.xs,
      marginTop: SPACING.sm,
    },
    strong: {
      fontWeight: TYPOGRAPHY.weights.bold,
      color: textColor,
    },
    em: {
      fontStyle: 'italic',
    },
    bullet_list: {
      marginTop: 6,
      marginBottom: 6,
    },
    ordered_list: {
      marginTop: 6,
      marginBottom: 6,
    },
    list_item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 3,
      marginBottom: 3,
    },
    bullet_list_icon: {
      color: theme.accent,
      fontSize: TYPOGRAPHY.sizes.xs,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
      marginRight: SPACING.sm,
      marginTop: SPACING.sm,
    },
    bullet_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    ordered_list_icon: {
      color: theme.accent,
      fontSize: TYPOGRAPHY.sizes.sm,
      fontWeight: TYPOGRAPHY.weights.semibold,
      marginRight: SPACING.sm,
      lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
    },
    ordered_list_content: {
      flex: 1,
      flexShrink: 1,
    },
    code_inline: {
      backgroundColor: 'transparent',
      color: theme.accent,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 0,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: TYPOGRAPHY.sizes.sm,
    },
    code_block: {
      backgroundColor: 'transparent',
      padding: SPACING.md,
      borderRadius: 0,
      marginVertical: SPACING.sm,
    },
    fence: {
      backgroundColor: 'transparent',
      padding: SPACING.md,
      borderRadius: 0,
      marginVertical: SPACING.sm,
    },
    link: {
      color: theme.accent,
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    hr: {
      backgroundColor: theme.border,
      height: 1,
      marginVertical: SPACING.md,
    },
    textgroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
    },
    text: {
      color: textColor,
    },
  }), [theme, textColor]);

  // Sanitize streaming markdown
  const displayText = isStreaming ? sanitizeStreamingMarkdown(text) : text;

  return (
    <View style={[styles.container, { maxWidth }]}>
      {/* Image (if present) */}
      {image && (
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel="Uploaded image"
        />
      )}

      {/* Text content */}
      {displayText && (
        isBot ? (
          <Markdown style={markdownStyles}>
            {displayText}
          </Markdown>
        ) : (
          <Text style={[styles.userText, { color: theme.text }]}>
            {displayText}
          </Text>
        )
      )}
    </View>
  );
}

MessageContent.propTypes = {
  text: PropTypes.string,
  image: PropTypes.string,
  isBot: PropTypes.bool.isRequired,
  isStreaming: PropTypes.bool,
  maxWidth: PropTypes.number,
};

MessageContent.defaultProps = {
  isStreaming: false,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  userText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: TYPOGRAPHY.sizes.base * TYPOGRAPHY.lineHeights.normal,
  },
});

export default memo(MessageContent);
