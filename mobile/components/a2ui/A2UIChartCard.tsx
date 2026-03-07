/**
 * A2UIChartCard — Renders a generic chart inline in chat.
 *
 * Supports line and bar charts via react-native-svg.
 * Fully driven by widget.context — no domain coupling.
 *
 * Context schema:
 * {
 *   chartType: 'line' | 'bar',
 *   title?: string,
 *   xLabel?: string,
 *   yLabel?: string,
 *   labels: string[],           // x-axis labels
 *   datasets: [{ label: string, data: number[], color?: string }],
 *   baseline?: { value: number, label: string },
 *   summary?: string,
 * }
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Circle, Text as SvgText, G } from 'react-native-svg';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import type { A2UIPayload } from '../../types';

interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

interface ChartContext {
  chartType?: 'line' | 'bar';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  labels?: string[];
  datasets?: ChartDataset[];
  baseline?: { value: number; label: string };
  summary?: string;
}

const CHART_W = 300;
const CHART_H = 160;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

const DEFAULT_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];

function parseContext(ctx: Record<string, unknown> | undefined): ChartContext {
  if (!ctx) return {};
  return {
    chartType: ctx.chartType === 'bar' ? 'bar' : 'line',
    title: typeof ctx.title === 'string' ? ctx.title : undefined,
    xLabel: typeof ctx.xLabel === 'string' ? ctx.xLabel : undefined,
    yLabel: typeof ctx.yLabel === 'string' ? ctx.yLabel : undefined,
    labels: Array.isArray(ctx.labels) ? ctx.labels.map(String) : undefined,
    datasets: Array.isArray(ctx.datasets)
      ? ctx.datasets
          .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
          .map((d, i) => ({
            label: String(d.label || `Series ${i + 1}`),
            data: Array.isArray(d.data) ? d.data.map(Number).filter((n) => !isNaN(n)) : [],
            color: typeof d.color === 'string' ? d.color : undefined,
          }))
      : undefined,
    baseline:
      typeof ctx.baseline === 'object' && ctx.baseline !== null
        ? {
            value: Number((ctx.baseline as Record<string, unknown>).value) || 0,
            label: String((ctx.baseline as Record<string, unknown>).label || ''),
          }
        : undefined,
    summary: typeof ctx.summary === 'string' ? ctx.summary : undefined,
  };
}

interface A2UIChartCardProps {
  widget: A2UIPayload;
}

export default function A2UIChartCard({ widget }: A2UIChartCardProps) {
  const { theme } = useApp();
  const chart = useMemo(() => parseContext(widget.context), [widget.context]);

  const datasets = chart.datasets || [];
  const labels = chart.labels || [];
  const pointCount = labels.length;

  // Compute y-axis range across all datasets + baseline
  const { yMin, yMax } = useMemo(() => {
    const allValues = datasets.flatMap((d) => d.data);
    if (chart.baseline) allValues.push(chart.baseline.value);
    if (allValues.length === 0) return { yMin: 0, yMax: 10 };
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const padding = (rawMax - rawMin) * 0.15 || 1;
    return { yMin: Math.max(0, rawMin - padding), yMax: rawMax + padding };
  }, [datasets, chart.baseline]);

  const toX = (i: number) => PAD.left + (pointCount > 1 ? (i / (pointCount - 1)) * PLOT_W : PLOT_W / 2);
  const toY = (v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin || 1)) * PLOT_H;

  // Y-axis tick values (3-5 ticks)
  const yTicks = useMemo(() => {
    const count = 4;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  if (datasets.length === 0 || pointCount === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceVariant, borderColor: theme.inputBorder }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No chart data available</Text>
      </View>
    );
  }

  const isBar = chart.chartType === 'bar';
  const barWidth = Math.max(8, Math.min(24, PLOT_W / pointCount - 4));

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
      {/* Title */}
      {(chart.title || widget.title) && (
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {chart.title || widget.title}
        </Text>
      )}

      {/* Chart */}
      <View style={styles.chartWrap}>
        <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          {/* Y-axis gridlines + labels */}
          {yTicks.map((tick) => {
            const y = toY(tick);
            return (
              <G key={`yt-${tick}`}>
                <Line x1={PAD.left} y1={y} x2={CHART_W - PAD.right} y2={y} stroke={theme.inputBorder} strokeWidth={0.5} />
                <SvgText x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill={theme.textMuted}>
                  {tick % 1 === 0 ? String(tick) : tick.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis labels */}
          {labels.map((label, i) => {
            const x = isBar ? PAD.left + (i + 0.5) * (PLOT_W / pointCount) : toX(i);
            return (
              <SvgText
                key={`xl-${i}`}
                x={x}
                y={CHART_H - 4}
                textAnchor="middle"
                fontSize={8}
                fill={theme.textMuted}
              >
                {label.length > 5 ? label.slice(0, 5) : label}
              </SvgText>
            );
          })}

          {/* Baseline dashed line */}
          {chart.baseline && (
            <G>
              <Line
                x1={PAD.left}
                y1={toY(chart.baseline.value)}
                x2={CHART_W - PAD.right}
                y2={toY(chart.baseline.value)}
                stroke={theme.warning || '#FF9800'}
                strokeWidth={1}
                strokeDasharray="4,3"
              />
              <SvgText
                x={CHART_W - PAD.right}
                y={toY(chart.baseline.value) - 4}
                textAnchor="end"
                fontSize={8}
                fill={theme.warning || '#FF9800'}
              >
                {chart.baseline.label}
              </SvgText>
            </G>
          )}

          {/* Datasets */}
          {datasets.map((ds, di) => {
            const color = ds.color || DEFAULT_COLORS[di % DEFAULT_COLORS.length];
            if (isBar) {
              return (
                <G key={`ds-${di}`}>
                  {ds.data.slice(0, pointCount).map((val, i) => {
                    const barX = PAD.left + (i + 0.5) * (PLOT_W / pointCount) - barWidth / 2 + di * (barWidth / datasets.length);
                    const barH = ((val - yMin) / (yMax - yMin || 1)) * PLOT_H;
                    return (
                      <Rect
                        key={`bar-${di}-${i}`}
                        x={barX}
                        y={PAD.top + PLOT_H - barH}
                        width={barWidth / datasets.length}
                        height={barH}
                        fill={color}
                        rx={2}
                        opacity={0.85}
                      />
                    );
                  })}
                </G>
              );
            }
            // Line chart
            return (
              <G key={`ds-${di}`}>
                {ds.data.slice(0, pointCount).map((val, i) => {
                  if (i === 0) return null;
                  return (
                    <Line
                      key={`ln-${di}-${i}`}
                      x1={toX(i - 1)}
                      y1={toY(ds.data[i - 1])}
                      x2={toX(i)}
                      y2={toY(val)}
                      stroke={color}
                      strokeWidth={2}
                    />
                  );
                })}
                {ds.data.slice(0, pointCount).map((val, i) => (
                  <Circle key={`pt-${di}-${i}`} cx={toX(i)} cy={toY(val)} r={3} fill={color} />
                ))}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend (if multiple datasets) */}
      {datasets.length > 1 && (
        <View style={styles.legend}>
          {datasets.map((ds, i) => (
            <View key={`leg-${i}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>{ds.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      {chart.summary && (
        <Text style={[styles.summary, { color: theme.textMuted }]}>{chart.summary}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
  },
  chartWrap: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  summary: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    padding: SPACING.lg,
  },
});
