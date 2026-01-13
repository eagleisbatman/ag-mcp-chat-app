/**
 * Animated scroll-to-bottom button
 * Appears when user scrolls up in chat
 */
import React, { memo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import IconButton from '../ui/IconButton';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../constants/strings';

function ScrollToBottomButton({
  visible,
  animatedValue,
  onPress,
}) {
  const { theme } = useApp();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animatedValue,
          transform: [
            { 
              translateY: animatedValue.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [60, 0] 
              }) 
            },
            { 
              scale: animatedValue.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [0.8, 1] 
              }) 
            },
          ],
        }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <IconButton
        icon="chevron-down"
        onPress={onPress}
        size={40}
        backgroundColor={theme.accent}
        color="#FFFFFF"
        accessibilityLabel={t('a11y.scrollToBottom')}
      />
    </Animated.View>
  );
}

ScrollToBottomButton.propTypes = {
  visible: PropTypes.bool.isRequired,
  animatedValue: PropTypes.object.isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    zIndex: 10,
  },
});

export default memo(ScrollToBottomButton);
