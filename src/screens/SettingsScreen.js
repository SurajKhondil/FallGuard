import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';

export default function SettingsScreen({ navigation }) {
  const { settings, updateSettings, mode, changeMode } = useApp();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* System Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detection Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.settingName}>AI Voice Alerts</Text>
                <Text style={styles.settingDesc}>Speak aloud when a fall is detected</Text>
              </View>
            </View>
            <Switch
              value={settings?.voiceAlerts}
              onValueChange={(v) => updateSettings({ voiceAlerts: v })}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="timer-outline" size={20} color={COLORS.warning} />
              <View>
                <Text style={styles.settingName}>Alert Cooldown</Text>
                <Text style={styles.settingDesc}>Wait 15s before next alert</Text>
              </View>
            </View>
            <Text style={styles.settingValueText}>15 sec</Text>
          </View>
        </View>

        {/* Operating Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Mode</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="flask-outline" size={20} color={COLORS.danger} />
              <View>
                <Text style={styles.settingName}>Simulation Mode</Text>
                <Text style={styles.settingDesc}>Use mock data instead of live camera</Text>
              </View>
            </View>
            <Switch
              value={mode === 'simulation'}
              onValueChange={(v) => changeMode(v ? 'simulation' : 'live')}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.textPrimary },
  
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg },

  section: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingName: { fontSize: FONTS.md, fontWeight: '600', color: COLORS.textPrimary },
  settingDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  settingValueText: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.textMuted },
  
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },

  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  aboutLabel: { fontSize: FONTS.md, color: COLORS.textPrimary },
  aboutValue: { fontSize: FONTS.md, color: COLORS.textSecondary },
});
