import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { ELEVATION, ElevationStyle } from '../../constants/elevation';

type ElevationLevel = 'sm' | 'md' | 'lg';

interface CardProps {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  padding?: number;
  elevation?: ElevationLevel;
}

export default function Card({
  children,
  style,
  backgroundColor,
  borderColor,
  borderWidth = 0,
  radius = 0,
  padding = 0,
  elevation,
}: CardProps): JSX.Element {
  const { theme } = useApp();
  const elevationStyle: ElevationStyle | null = elevation ? ELEVATION[elevation] : null;

  return (
    <View
      style={[
        styles.base,
        elevationStyle as ViewStyle,
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
