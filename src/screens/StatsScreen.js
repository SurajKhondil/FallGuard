import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.md * 2 - 2;

export default function StatsScreen() {
  const { logs } = useApp();

  const stats = useMemo(() => {
    const total = logs.length;
    const falls = logs.filter((l) => l.type === 'FALL').length;
    const normal = logs.filter((l) => l.type === 'NORMAL').length;
    const noPerson = logs.filter((l) => l.type === 'NO_PERSON').length;
    const fallRate = total > 0 ? ((falls / total) * 100).toFixed(1) : '0.0';
    const avgConf = total > 0
      ? (logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / total * 100).toFixed(1)
      : '0.0';
    return { total, falls, normal, noPerson, fallRate, avgConf };
  }, [logs]);

  // Build timeline chart data - last 7 days
  const chartData = useMemo(() => {
    const days = 7;
    const now = new Date();
    const labels = [];
    const fallData = [];
    const normalData = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      labels.push(d.toLocaleDateString('en', { weekday: 'short' }));

      const dayLogs = logs.filter((l) => new Date(l.timestamp).toDateString() === dateStr);
      fallData.push(dayLogs.filter((l) => l.type === 'FALL').length);
      normalData.push(dayLogs.filter((l) => l.type === 'NORMAL').length);
    }

    return { labels, fallData, normalData };
  }, [logs]);

  // Build daily chart data - today's falls grouped by 4-hour blocks
  const dailyChartData = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === todayStr && l.type === 'FALL');
    
    const blocks = Array(6).fill(0);
    const labels = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];
    
    todayLogs.forEach(l => {
      const h = new Date(l.timestamp).getHours();
      const blockIdx = Math.floor(h / 4);
      if (blockIdx >= 0 && blockIdx < 6) {
        blocks[blockIdx]++;
      }
    });
    
    return { labels, data: blocks };
  }, [logs]);

  const hasChartData = chartData.fallData.some((v) => v > 0) || chartData.normalData.some((v) => v > 0);
  const hasDailyData = dailyChartData.data.some((v) => v > 0);

  const chartConfig = {
    backgroundColor: COLORS.bgCard,
    backgroundGradientFrom: COLORS.bgCard,
    backgroundGradientTo: COLORS.bgCard,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(88,166,255,${opacity})`,
    labelColor: (opacity = 1) => `rgba(139,148,158,${opacity})`,
    style: { borderRadius: RADIUS.lg },
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>System performance overview</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.grid}>
          <StatCard value={stats.total} label="Total Events" icon="layers" color={COLORS.primary} full={false} />
          <StatCard value={stats.falls} label="Falls Detected" icon="warning" color={COLORS.danger} full={false} />
          <StatCard value={`${stats.fallRate}%`} label="Fall Rate" icon="pie-chart" color={COLORS.warning} full={false} />
          <StatCard value={`${stats.avgConf}%`} label="Avg. Confidence" icon="analytics" color={COLORS.success} full={false} />
        </View>

        {/* Distribution Bar */}
        {stats.total > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Event Distribution</Text>
            <View style={styles.distBar}>
              {stats.falls > 0 && (
                <View style={[styles.distSegment, { flex: stats.falls / stats.total, backgroundColor: COLORS.danger }]} />
              )}
              {stats.normal > 0 && (
                <View style={[styles.distSegment, { flex: stats.normal / stats.total, backgroundColor: COLORS.success }]} />
              )}
              {stats.noPerson > 0 && (
                <View style={[styles.distSegment, { flex: stats.noPerson / stats.total, backgroundColor: COLORS.textMuted }]} />
              )}
            </View>
            <View style={styles.distLegend}>
              <LegendItem color={COLORS.danger} label="Falls" value={stats.falls} />
              <LegendItem color={COLORS.success} label="Normal" value={stats.normal} />
              <LegendItem color={COLORS.textMuted} label="No Person" value={stats.noPerson} />
            </View>
          </View>
        )}

        {/* Timeline Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>7-Day Fall Timeline</Text>
          {hasChartData ? (
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [
                  { data: chartData.fallData, color: (op = 1) => `rgba(248,81,73,${op})`, strokeWidth: 2 },
                  { data: chartData.normalData.map((v) => v), color: (op = 1) => `rgba(63,185,80,${op})`, strokeWidth: 2 },
                ],
                legend: ['Falls', 'Normal'],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines
            />
          ) : (
            <View style={styles.noChart}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.noChartText}>No data yet. Start detection to see trends.</Text>
            </View>
          )}
        </View>

        {/* Daily Fall Bar Chart (Today) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Fall Activity</Text>
          {hasDailyData ? (
            <BarChart
              data={{
                labels: dailyChartData.labels,
                datasets: [{ data: dailyChartData.data }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(248,81,73,${opacity})`,
                barPercentage: 0.6,
              }}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              fromZero={true}
            />
          ) : (
             <View style={styles.noChart}>
               <Ionicons name="stats-chart" size={40} color={COLORS.textMuted} />
               <Text style={styles.noChartText}>No falls detected today.</Text>
             </View>
          )}
        </View>

        {/* Recent Activity */}
        {logs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most Recent Event</Text>
            <View style={styles.recentRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.recentText}>{formatDate(logs[0].timestamp)}</Text>
              <View
                style={[
                  styles.recentBadge,
                  {
                    backgroundColor: logs[0].type === 'FALL'
                      ? `${COLORS.danger}20`
                      : logs[0].type === 'NORMAL'
                      ? `${COLORS.success}20`
                      : `${COLORS.textMuted}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.recentBadgeText,
                    {
                      color: logs[0].type === 'FALL'
                        ? COLORS.danger
                        : logs[0].type === 'NORMAL'
                        ? COLORS.success
                        : COLORS.textMuted,
                    },
                  ]}
                >
                  {logs[0].type}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty state */}
        {logs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyDesc}>Start detection from the Dashboard to generate statistics.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label, icon, color }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}30` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={[styles.legendValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: 14 },

  header: { paddingTop: 4, paddingBottom: 4 },
  title: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    width: (width - SPACING.md * 2 - 10) / 2,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 6,
    borderWidth: 1,
  },
  statIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: FONTS.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  cardTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.md },

  distBar: {
    height: 12, flexDirection: 'row', borderRadius: RADIUS.full,
    overflow: 'hidden', backgroundColor: COLORS.bgInput,
  },
  distSegment: { height: '100%' },
  distLegend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm },
  legendValue: { fontWeight: '700', fontSize: FONTS.sm },

  chart: { borderRadius: RADIUS.md, marginHorizontal: -4 },
  noChart: { alignItems: 'center', gap: 8, paddingVertical: SPACING.lg },
  noChartText: { color: COLORS.textSecondary, fontSize: FONTS.sm, textAlign: 'center', lineHeight: 20 },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sm },
  recentBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  recentBadgeText: { fontSize: FONTS.xs, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.textPrimary },
  emptyDesc: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.xl,
  },
});
