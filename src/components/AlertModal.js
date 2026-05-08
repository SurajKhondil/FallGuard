import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Vibration, Alert, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { formatDateTime } from '../utils/helpers';

const { width } = Dimensions.get('window');

export default function AlertModal({ event, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [smsSent, setSmsSent] = useState(false);
  const { settings, user } = useApp();

  useEffect(() => {
    if (event) {
      setSmsSent(false); // Reset on new event
      // Vibrate and Haptic pattern
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Voice Alert
      if (settings?.voiceAlerts) {
        Speech.speak("Warning, a fall has been detected. Please check immediately.", {
          language: 'en-US',
          pitch: 1.1,
          rate: 0.9,
        });
      }

      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Pulse loop
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
        Speech.stop();
      };
    }
  }, [event, settings?.voiceAlerts]);

  const sendEmergencySMS = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isAvailable = await SMS.isAvailableAsync();
    
    const phoneNumber = user?.mobile || '';
    if (!phoneNumber) {
      Alert.alert('No Number Registered', 'Please register an emergency mobile number in your Profile.');
      return;
    }

    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync(
        [phoneNumber],
        `EMERGENCY ALERT: A fall has been detected at ${formatDateTime(event.timestamp)} with ${(event.confidence * 100).toFixed(0)}% confidence. Please check immediately.`
      );
      if (result === 'sent') setSmsSent(true);
    } else {
      Alert.alert('SMS Unavailable', 'There is no SMS service available on this device.');
    }
  };

  if (!event) return null;

  return (
    <Modal visible transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Icon */}
          <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconInner}>
              <Ionicons name="warning" size={40} color={COLORS.danger} />
            </View>
          </Animated.View>

          <Text style={styles.title}>⚠️ Fall Detected!</Text>
          <Text style={styles.subtitle}>
            A fall has been detected. Please check on the person immediately.
          </Text>

          {/* Meta */}
          <View style={styles.meta}>
            <MetaRow icon="time-outline" label="Time" value={formatDateTime(event.timestamp)} />
            <MetaRow
              icon="analytics-outline"
              label="Confidence"
              value={`${(event.confidence * 100).toFixed(0)}%`}
              valueColor={COLORS.danger}
            />
            <MetaRow icon="hardware-chip-outline" label="Source" value={event.source === 'mock' ? 'Simulation' : 'Live AI'} />
          </View>

          {/* SMS Status */}
          {smsSent && (
            <View style={styles.smsSuccess}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.smsSuccessText}>Emergency SMS Sent</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionCol}>
            <TouchableOpacity style={styles.callBtn} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const emergencyNumber = user?.mobile;
              if (emergencyNumber) {
                Linking.openURL(`tel:${emergencyNumber}`);
              } else {
                Alert.alert(
                  'No Emergency Number',
                  'No mobile number is registered in your profile. Please add one in Profile > Emergency Mobile Number.',
                  [{ text: 'OK' }]
                );
              }
            }}>
              <Ionicons name="call" size={20} color="#FFF" />
              <Text style={styles.callBtnText}>
                {user?.mobile ? `Call ${user.mobile}` : 'Call Emergency (No # Set)'}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.smsBtn} onPress={sendEmergencySMS}>
                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                <Text style={styles.smsBtnText}>Notify</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dismissBtn} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDismiss();
              }}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MetaRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.dangerGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(207,34,46,0.4)',
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(207,34,46,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.xxl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  meta: {
    width: '100%',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    flex: 1,
  },
  metaValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  smsSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.successGlow, borderRadius: RADIUS.sm,
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: SPACING.md, width: '100%', justifyContent: 'center'
  },
  smsSuccessText: { color: COLORS.success, fontWeight: '700', fontSize: FONTS.sm },
  actionCol: {
    width: '100%',
    gap: 10,
  },
  callBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: FONTS.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  smsBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  smsBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONTS.md,
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: FONTS.md,
  },
});
