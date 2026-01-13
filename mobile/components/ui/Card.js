import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useApp } from '../../contexts/AppContext';
import { SPACING } from '../../constants/themes';
import { ELEVATION } from '../../constants/elevation';

export default function Card({
  children,
  style,
  backgroundColor,
  borderColor,
  borderWidth = 0,
  radius = 0,
  padding = 0,
  elevation,
}) {
  const { theme } = useApp();
  const elevationStyle = elevation ? ELEVATION[elevation] : null;

  return (
    <View
      style={[
        styles.base,
        elevationStyle,
        {
          backgroundColor: backgroundColor ?? 'transparent',
          borderColor: borderColor ?? theme.border,
          borderWidth,
          borderRadius: radius,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

Card.propTypes = {
  children: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  backgroundColor: PropTypes.string,
  borderColor: PropTypes.string,
  borderWidth: PropTypes.number,
  radius: PropTypes.number,
  padding: PropTypes.number,
  elevation: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
};
