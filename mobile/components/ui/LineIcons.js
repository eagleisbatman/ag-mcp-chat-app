import React from 'react';
import { View, StyleSheet } from 'react-native';

const LINE_WIDTH = 2;

/**
 * Sharp line-style icons matching the waveform aesthetic
 * Uses thin 2px lines for a minimal, clean look
 */

export function PlusIcon({ size = 22, color = '#000' }) {
  const lineLength = size * 0.6;
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Horizontal line */}
      <View
        style={[
          styles.line,
          {
            width: lineLength,
            height: LINE_WIDTH,
            backgroundColor: color,
            position: 'absolute',
          },
        ]}
      />
      {/* Vertical line */}
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: lineLength,
            backgroundColor: color,
            position: 'absolute',
          },
        ]}
      />
    </View>
  );
}

export function ClockIcon({ size = 22, color = '#000' }) {
  const circleSize = size * 0.85;
  const handLength = size * 0.25;
  const hourHandLength = size * 0.18;
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Circle outline */}
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth: LINE_WIDTH,
          borderColor: color,
          position: 'absolute',
        }}
      />
      {/* Minute hand (vertical, pointing up) */}
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: handLength,
            backgroundColor: color,
            position: 'absolute',
            top: size * 0.22,
          },
        ]}
      />
      {/* Hour hand (horizontal, pointing right) */}
      <View
        style={[
          styles.line,
          {
            width: hourHandLength,
            height: LINE_WIDTH,
            backgroundColor: color,
            position: 'absolute',
            left: size * 0.5,
          },
        ]}
      />
    </View>
  );
}

export function CameraIcon({ size = 24, color = '#000' }) {
  const bodyWidth = size * 0.8;
  const bodyHeight = size * 0.55;
  const lensSize = size * 0.28;
  const viewfinderWidth = size * 0.2;
  const viewfinderHeight = size * 0.12;
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Camera body */}
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          borderRadius: 3,
          borderWidth: LINE_WIDTH,
          borderColor: color,
          position: 'absolute',
          top: size * 0.28,
        }}
      />
      {/* Viewfinder bump */}
      <View
        style={{
          width: viewfinderWidth,
          height: viewfinderHeight,
          borderRadius: 2,
          borderWidth: LINE_WIDTH,
          borderColor: color,
          position: 'absolute',
          top: size * 0.16,
          left: size * 0.28,
          borderBottomWidth: 0,
        }}
      />
      {/* Lens circle */}
      <View
        style={{
          width: lensSize,
          height: lensSize,
          borderRadius: lensSize / 2,
          borderWidth: LINE_WIDTH,
          borderColor: color,
          position: 'absolute',
          top: size * 0.42,
        }}
      />
    </View>
  );
}

export function ImageIcon({ size = 24, color = '#000' }) {
  const frameWidth = size * 0.8;
  const frameHeight = size * 0.65;
  const sunSize = size * 0.15;
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Frame */}
      <View
        style={{
          width: frameWidth,
          height: frameHeight,
          borderRadius: 3,
          borderWidth: LINE_WIDTH,
          borderColor: color,
          position: 'absolute',
        }}
      />
      {/* Sun circle */}
      <View
        style={{
          width: sunSize,
          height: sunSize,
          borderRadius: sunSize / 2,
          backgroundColor: color,
          position: 'absolute',
          top: size * 0.25,
          right: size * 0.22,
        }}
      />
      {/* Mountain - left peak */}
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: size * 0.22,
            backgroundColor: color,
            position: 'absolute',
            bottom: size * 0.22,
            left: size * 0.28,
            transform: [{ rotate: '30deg' }],
          },
        ]}
      />
      {/* Mountain - right peak */}
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: size * 0.22,
            backgroundColor: color,
            position: 'absolute',
            bottom: size * 0.22,
            left: size * 0.38,
            transform: [{ rotate: '-30deg' }],
          },
        ]}
      />
      {/* Small hill */}
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: size * 0.14,
            backgroundColor: color,
            position: 'absolute',
            bottom: size * 0.22,
            right: size * 0.28,
            transform: [{ rotate: '35deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.line,
          {
            width: LINE_WIDTH,
            height: size * 0.14,
            backgroundColor: color,
            position: 'absolute',
            bottom: size * 0.22,
            right: size * 0.22,
            transform: [{ rotate: '-35deg' }],
          },
        ]}
      />
    </View>
  );
}

export function ArrowUpIcon({ size = 20, color = '#FFF' }) {
  const stemHeight = size * 0.5;
  const chevronSize = size * 0.35;
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Vertical stem */}
      <View
        style={{
          width: LINE_WIDTH,
          height: stemHeight,
          backgroundColor: color,
          position: 'absolute',
          top: size * 0.25,
        }}
      />
      {/* Chevron left arm */}
      <View
        style={{
          width: chevronSize,
          height: LINE_WIDTH,
          backgroundColor: color,
          position: 'absolute',
          top: size * 0.25,
          transform: [{ rotate: '-45deg' }, { translateX: -chevronSize * 0.35 }, { translateY: chevronSize * 0.35 }],
        }}
      />
      {/* Chevron right arm */}
      <View
        style={{
          width: chevronSize,
          height: LINE_WIDTH,
          backgroundColor: color,
          position: 'absolute',
          top: size * 0.25,
          transform: [{ rotate: '45deg' }, { translateX: chevronSize * 0.35 }, { translateY: chevronSize * 0.35 }],
        }}
      />
    </View>
  );
}

export function VoiceWaveIcon({ size = 20, color = '#000' }) {
  return (
    <View style={[styles.waveContainer, { width: size, height: size }]}>
      <View style={[styles.waveLine, { height: size * 0.4, backgroundColor: color }]} />
      <View style={[styles.waveLine, { height: size * 0.8, backgroundColor: color }]} />
      <View style={[styles.waveLine, { height: size * 0.6, backgroundColor: color }]} />
      <View style={[styles.waveLine, { height: size * 0.8, backgroundColor: color }]} />
      <View style={[styles.waveLine, { height: size * 0.4, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    borderRadius: 1,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  waveLine: {
    width: LINE_WIDTH,
    borderRadius: 1,
  },
});
