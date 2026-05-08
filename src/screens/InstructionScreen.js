import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

const STEPS = [
  {
    step: '01',
    icon: 'camera',
    color: '#58A6FF',
    title: 'Set Up Camera',
    desc: 'Position your device camera to cover the monitoring area. Ensure adequate lighting and a clear view of the space.',
  },
  {
    step: '02',
    icon: 'play-circle',
    color: '#3FB950',
    title: 'Start Monitoring',
    desc: 'Tap the "Start Detection" button on the Dashboard. The AI begins analyzing the video feed in real time.',
  },
  {
    step: '03',
    icon: 'hardware-chip',
    color: '#D29922',
    title: 'AI Analysis',
    desc: 'The AI continuously evaluates body posture and movement patterns. It classifies each frame as: No Person → Normal → Fall.',
  },
  {
    step: '04',
    icon: 'warning',
    color: '#F85149',
    title: 'Fall Alert',
    desc: 'When a fall is detected with high confidence, an immediate alert is triggered with vibration and a modal notification.',
  },
  {
    step: '05',
    icon: 'list',
    color: '#8B949E',
    title: 'Review Logs',
    desc: 'All events are saved in the Logs tab. You can filter, search, and review the full event history with timestamps.',
  },
];

const ALERTS_INFO = [
  { icon: 'eye-off', color: '#8B949E', label: 'No Person', desc: 'Camera active, no one in frame.' },
  { icon: 'person', color: '#3FB950', label: 'Normal', desc: 'Person detected, moving safely.' },
  { icon: 'warning', color: '#F85149', label: 'Fall Detected', desc: 'Immediate attention required.' },
];

export default function InstructionScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBg}>
            <Ionicons name="book" size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>How It Works</Text>
          <Text style={styles.subtitle}>Follow these steps to start using FallGuard AI</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsSection}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepNumCircle, { backgroundColor: `${s.color}20`, borderColor: `${s.color}40` }]}>
                  <Text style={[styles.stepNum, { color: s.color }]}>{s.step}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.connector} />}
              </View>
              <View style={styles.stepRight}>
                <View style={[styles.stepIconBg, { backgroundColor: `${s.color}15` }]}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Alert meanings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Understanding Alerts</Text>
          {ALERTS_INFO.map((a, i) => (
            <View key={i} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: a.color }]} />
              <Ionicons name={a.icon} size={18} color={a.color} style={{ marginRight: 8 }} />
              <View style={styles.alertText}>
                <Text style={[styles.alertLabel, { color: a.color }]}>{a.label}</Text>
                <Text style={styles.alertDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={[styles.section, styles.tipsCard]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={18} color="#D29922" />
            <Text style={styles.tipsTitle}>Pro Tips</Text>
          </View>
          {[
            'Keep the camera at 1.5–2m height for best coverage.',
            'Ensure the area is well-lit to improve accuracy.',
            'Use Simulation Mode first to understand the system.',
            'Review logs regularly to track patterns.',
          ].map((tip, i) => (
            <View key={i} style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={22} color="#FFF" />
          <Text style={styles.ctaText}>Proceed to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Welcome</Text>
        </TouchableOpacity>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.xl,
  },
  iconBg: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  title: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: FONTS.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  stepsSection: { gap: 0, marginBottom: SPACING.xl },
  stepCard: { flexDirection: 'row', gap: 14, minHeight: 80 },
  stepLeft: { alignItems: 'center', width: 44 },
  stepNumCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  stepNum: { fontWeight: '800', fontSize: FONTS.sm },
  connector: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4, marginBottom: 4 },
  stepRight: {
    flex: 1, flexDirection: 'row', gap: 12,
    paddingBottom: SPACING.lg, paddingTop: 2,
  },
  stepIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  stepText: { flex: 1 },
  stepTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.md, marginBottom: 4 },
  stepDesc: { color: COLORS.textSecondary, fontSize: FONTS.sm, lineHeight: 20 },

  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.lg,
    marginBottom: SPACING.md,
  },
  alertRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  alertText: { flex: 1 },
  alertLabel: { fontWeight: '700', fontSize: FONTS.md },
  alertDesc: { color: COLORS.textSecondary, fontSize: FONTS.sm },

  tipsCard: {
    backgroundColor: `${COLORS.warning}10`, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: `${COLORS.warning}30`,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  tipsTitle: { color: '#D29922', fontWeight: '700', fontSize: FONTS.md },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D29922', marginTop: 7 },
  tipText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sm, lineHeight: 20 },

  ctaBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: FONTS.lg },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.md,
    fontWeight: '600',
  },
});
