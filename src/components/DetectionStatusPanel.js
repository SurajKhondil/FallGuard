import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { getStatusColor, getStatusLabel } from '../utils/helpers';

const STATUS_ICONS = {
  NO_PERSON: 'eye-off-outline',
  NORMAL: 'person-outline',
  FALL: 'warning-outline',
};

export default function DetectionStatusPanel({ status = 'NO_PERSON', confidence = 0, isMonitoring = false }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const icon = STATUS_ICONS[status] || 'help-outline';

  useEffect(() => {
    if (isMonitoring) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
        ])
      );
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isMonitoring, status]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  return (
    <View style={[styles.card, { borderColor: `${color}55` }]}>
      {/* Glow BG */}
      {isMonitoring && (
        <Animated.View
          style={[styles.glowBg, { backgroundColor: color, opacity: glowOpacity }]}
          pointerEvents="none"
        />
      )}

      <View style={styles.row}>
        {/* Icon */}
        <Animated.View
          style={[
            styles.iconCircle,
            { backgroundColor: `${color}22`, transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons name={icon} size={28} color={color} />
        </Animated.View>

        <View style={styles.textBlock}>
          <Text style={styles.statusLabel}>Detection Status</Text>
          <Text style={[styles.statusValue, { color }]}>{label}</Text>

          {/* Confidence mini-bar */}
          {confidence > 0 && (
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${Math.round(confidence * 100)}%`, backgroundColor: color },
                ]}
              />
            </View>
          )}
        </View>

        {/* Live dot */}
        {isMonitoring && (
          <View style={styles.liveBadge}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0.6, 1] }) }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Status description */}
      <Text style={styles.description}>
        {status === 'NO_PERSON' && 'Camera feed is active. No person detected in frame.'}
        {status === 'NORMAL' && `Person is in frame and moving normally. (${Math.round(confidence * 100)}% confidence)`}
        {status === 'FALL' && `⚠️ Fall detected with ${Math.round(confidence * 100)}% confidence. Alerting now!`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
  },
  glowBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: FONTS.lg,
    fontWeight: '800',
  },
  miniBarTrack: {
    height: 4,
    backgroundColor: COLORS.bgInput,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
    width: '80%',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(248,81,73,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(248,81,73,0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F85149',
  },
  liveText: {
    color: '#F85149',
    fontSize: FONTS.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    lineHeight: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
