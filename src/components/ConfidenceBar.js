import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { getConfidenceColor } from '../utils/helpers';

export default function ConfidenceBar({ confidence = 0, label = 'AI Confidence' }) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const colorInterpolate = animWidth.interpolate({
    inputRange: [0, 50, 80, 100],
    outputRange: [COLORS.success, COLORS.warning, COLORS.warning, COLORS.danger],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: confidence * 100,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [confidence]);

  const pct = Math.round(confidence * 100);
  const color = getConfidenceColor(confidence);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.pct, { color }]}>{pct}%</Text>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: colorInterpolate,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pct: {
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  track: {
    height: 8,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
