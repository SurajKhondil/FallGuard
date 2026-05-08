import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, StatusBar, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: 'videocam', color: '#58A6FF', title: 'Real-Time Monitoring', desc: 'Continuous AI-powered camera surveillance for instant fall detection.' },
  { icon: 'warning', color: '#F85149', title: 'Instant Alerts', desc: 'Immediate notifications with confidence scores when a fall is detected.' },
  { icon: 'bar-chart', color: '#3FB950', title: 'Analytics & Logs', desc: 'Detailed event history, statistics, and trend visualizations.' },
  { icon: 'shield-checkmark', color: '#D29922', title: 'Privacy First', desc: 'All processing happens on-device. Your data stays private.' },
];

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7, delay: 100 }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#F4F7FB', '#FFFFFF']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.pulseRing, {
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0.1, 0] })
            }]} />
            <Animated.View style={[styles.logoRing, { transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoInner}>
                <Ionicons name="shield" size={52} color={COLORS.primary} />
              </View>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.appName}>FallGuard AI</Text>
            <Text style={styles.tagline}>Protecting lives with intelligent fall detection</Text>
          </Animated.View>
        </View>

        {/* Feature Cards (Horizontal Scroll) */}
        <Animated.View style={[styles.featuresContainer, { opacity: fadeAnim }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            snapToInterval={width * 0.75 + 16} 
            decelerationRate="fast" 
            contentContainerStyle={styles.featuresScroll}
          >
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${f.color}15` }]}>
                  <Ionicons name={f.icon} size={30} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.cta, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Create an Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.instructionBtn}
            onPress={() => navigation.navigate('Instructions')}
            activeOpacity={0.85}
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.instructionBtnText}>How to Use FallGuard AI</Text>
          </TouchableOpacity>

          <Text style={styles.version}>v1.0.0 · Powered by AI</Text>
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: SPACING.xxl },

  hero: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    width: 120, height: 120,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryGlow,
  },
  logoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(9,105,218,0.1)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: FONTS.display,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },

  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featuresScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 16,
  },
  featureCard: {
    width: width * 0.75,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    alignItems: 'center',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.lg,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    lineHeight: 22,
    textAlign: 'center',
  },

  cta: {
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: FONTS.lg, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: FONTS.md, fontWeight: '600' },
  instructionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  instructionBtnText: { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: '700' },
  version: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 8 },
});
