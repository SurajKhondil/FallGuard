import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { formatTime, formatDate, getStatusColor, getStatusLabel } from '../utils/helpers';

export default function EventCard({ event }) {
  const color = getStatusColor(event.type);
  const label = getStatusLabel(event.type);
  const pct = Math.round((event.confidence || 0) * 100);

  const iconMap = {
    FALL: 'warning',
    NORMAL: 'person',
    NO_PERSON: 'eye-off',
  };

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={iconMap[event.type] || 'help'} size={18} color={color} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.type, { color }]}>{label}</Text>
          {pct > 0 && (
            <View style={[styles.confidenceBadge, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.confidenceText, { color }]}>{pct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} style={{ marginRight: 3 }} />
          <Text style={styles.date}>{formatDate(event.timestamp)}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="time-outline" size={11} color={COLORS.textMuted} style={{ marginRight: 3 }} />
          <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
        </View>
      </View>

      {/* Source tag */}
      <View style={styles.sourceTag}>
        <Text style={styles.sourceText}>{event.source === 'mock' ? 'SIM' : 'LIVE'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    fontWeight: '700',
    fontSize: FONTS.md,
  },
  confidenceBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  confidenceText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    color: COLORS.textMuted,
    fontSize: FONTS.xs,
  },
  dot: {
    color: COLORS.textMuted,
    marginHorizontal: 4,
    fontSize: FONTS.xs,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: FONTS.xs,
  },
  sourceTag: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sourceText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
