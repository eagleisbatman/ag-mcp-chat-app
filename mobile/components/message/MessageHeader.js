/**
 * Message header component with timestamp and speak button
 */
import React, { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';

/**
 * Format time for display (24h format)
 */
function formatTime(date) {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function MessageHeader({
  createdAt,
  isBot,
  isSpeaking,
  isLoadingAudio,
  onSpeak,
  hasContent,
}) {
  const { theme, isDark } = useApp();
  const rippleColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.header}>
      <Text style={[styles.timestamp, { color: theme.textMuted }]}>
        {formatTime(createdAt)}
      </Text>
      
      {/* Speak button - only show for bot messages with content */}
      {isBot && hasContent && (
        <Pressable
          onPress={onSpeak}
          style={({ pressed }) => [
            styles.speakButton,
            {
              backgroundColor: pressed 
                ? rippleColor 
                : 'transparent',
            }
          ]}
          accessibilityLabel={
            isSpeaking 
              ? t('a11y.stopSpeaking') 
              : t('a11y.speakMessage')
          }
          accessibilityRole="button"
        >
          {isLoadingAudio ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <AppIcon
              name={isSpeaking ? 'stop' : 'volume-high'}
              size={18}
              color={isSpeaking ? theme.accent : theme.textMuted}
            />
          )}
        </Pressable>
      )}
    </View>
  );
}

MessageHeader.propTypes = {
  createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
  isBot: PropTypes.bool.isRequired,
  isSpeaking: PropTypes.bool,
  isLoadingAudio: PropTypes.bool,
  onSpeak: PropTypes.func,
  hasContent: PropTypes.bool,
};

MessageHeader.defaultProps = {
  isSpeaking: false,
  isLoadingAudio: false,
  hasContent: false,
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  speakButton: {
    padding: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
});

export default memo(MessageHeader);
