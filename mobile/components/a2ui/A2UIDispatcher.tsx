/**
 * A2UIDispatcher — Routes A2UI widget payloads to the correct inline card.
 * Renders a list of A2UI cards after a bot message.
 *
 * Supports both legacy widget types (crop_picker, confirmation, etc.) and
 * new A2UI Envelope Protocol components (WeatherCard, DiagnosisCard, etc.)
 * that arrive via the _a2ui metadata in the context field.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import A2UIInlineCard from './A2UIInlineCard';
import A2UIChartCard from './A2UIChartCard';
import A2UIRichCard, { RICH_CARD_COMPONENTS } from './A2UIRichCard';
import type { A2UIPayload } from '../../types';

interface A2UIDispatcherProps {
  widgets: A2UIPayload[];
  onWidgetPress: (widget: A2UIPayload) => void;
  respondedWidgetIds?: Set<string>;
}

/**
 * Check if a widget is a new-format A2UI envelope component by looking for
 * the _a2ui metadata in context. These get routed to A2UIRichCard for
 * component-specific rendering.
 */
function isEnvelopeComponent(widget: A2UIPayload): boolean {
  const meta = widget.context?._a2ui as { component?: string } | undefined;
  return !!meta?.component && RICH_CARD_COMPONENTS.has(meta.component);
}

/**
 * Check if a widget is a chart-type from the new A2UI envelope protocol.
 * These have chartType in their context (set by operationToLegacyPayload).
 */
function isEnvelopeChart(widget: A2UIPayload): boolean {
  const meta = widget.context?._a2ui as { component?: string } | undefined;
  if (!meta?.component) return false;
  return !!widget.context?.chartType;
}

export default function A2UIDispatcher({ widgets, onWidgetPress, respondedWidgetIds }: A2UIDispatcherProps) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <View style={styles.container}>
      {widgets.map((widget) => {
        // New A2UI Envelope Protocol: route to rich card or chart renderers
        if (widget.context?._a2ui) {
          // Components with chart data (TemperatureChart, PrecipitationChart, etc.)
          // route to A2UIChartCard which can render line/bar charts
          if (isEnvelopeChart(widget)) {
            return <A2UIChartCard key={widget.widgetId} widget={widget} />;
          }
          // Rich domain components (WeatherCard, DiagnosisCard, etc.)
          // route to A2UIRichCard for component-specific rendering
          if (isEnvelopeComponent(widget)) {
            return <A2UIRichCard key={widget.widgetId} widget={widget} />;
          }
          // Fallback for envelope components we don't have dedicated renderers for
          return <A2UIRichCard key={widget.widgetId} widget={widget} />;
        }

        // Legacy chart widgets (widgetType === 'chart' without _a2ui metadata)
        if (widget.widgetType === 'chart') {
          return <A2UIChartCard key={widget.widgetId} widget={widget} />;
        }

        // Legacy interactive widgets (crop_picker, confirmation, etc.)
        return (
          <A2UIInlineCard
            key={widget.widgetId}
            widget={widget}
            onPress={onWidgetPress}
            responded={respondedWidgetIds?.has(widget.widgetId)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
});
