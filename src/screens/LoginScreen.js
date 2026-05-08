import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { loading, error, handleLogin, clearError } = useAuth();
  const { user } = useApp();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const onSubmit = async () => {
    await handleLogin(email.trim(), password);
    // AppNavigator auto-redirects to Main when user state is set
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoSmall}>
              <Ionicons name="shield" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your FallGuard account</Text>
          </View>

          {/* Error Banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Ionicons name="close" size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassBtn} 
              onPress={() => Alert.alert('Forgot Password', 'A password reset link has been sent to your email.')}
            >
              <Text style={styles.forgotPassText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <Text style={styles.submitText}>Signing in...</Text>
                : <><Text style={styles.submitText}>Sign In</Text><Ionicons name="arrow-forward" size={18} color="#FFF" /></>
              }
            </TouchableOpacity>
          </View>

          {/* Demo hint */}
          <View style={styles.demoHint}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.demoText}>Enter any valid email & password (6+ chars) to proceed</Text>
          </View>

          {/* Switch to signup */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, padding: SPACING.lg },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    marginTop: 40, borderWidth: 1, borderColor: COLORS.border,
  },

  body: { flex: 1, paddingTop: SPACING.xl },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoSmall: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md, borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  title: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: FONTS.md, color: COLORS.textSecondary },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${COLORS.danger}18`, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.danger}40`,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: FONTS.sm },

  form: { gap: SPACING.md, marginBottom: SPACING.md },
  fieldGroup: { gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: '600', marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    minHeight: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.md },
  eyeBtn: { padding: 4 },

  forgotPassBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 },
  forgotPassText: { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: '600' },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  submitText: { color: '#FFF', fontSize: FONTS.lg, fontWeight: '700' },

  demoHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  demoText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.xs, lineHeight: 16 },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  switchText: { color: COLORS.textSecondary, fontSize: FONTS.md },
  switchLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.md },
});
