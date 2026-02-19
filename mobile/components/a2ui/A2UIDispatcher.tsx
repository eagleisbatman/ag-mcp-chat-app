/**
 * A2UIDispatcher — Routes A2UI widget payloads to the correct inline card.
 * Renders a list of A2UI cards after a bot message.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import A2UIInlineCard from './A2UIInlineCard';
import type { A2UIPayload } from '../../types';

interface A2UIDispatcherProps {
  widgets: A2UIPayload[];
  onWidgetPress: (widget: A2UIPayload) => void;
  respondedWidgetIds?: Set<string>;
}

export default function A2UIDispatcher({ widgets, onWidgetPress, respondedWidgetIds }: A2UIDispatcherProps) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <View style={styles.container}>
      {widgets.map((widget) => (
        <A2UIInlineCard
          key={widget.widgetId}
          widget={widget}
          onPress={onWidgetPress}
          responded={respondedWidgetIds?.has(widget.widgetId)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
});
