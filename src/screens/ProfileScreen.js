import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSaveProfile = () => {
    updateUser({ ...user, name, email, mobile });
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please enter both current and new passwords.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    try {
      await api.changePassword(user.id, {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      Alert.alert('Failed', err.message || 'Could not change password.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || email || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Emergency Mobile Number</Text>
            <TextInput style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+1234567890" />
            <Text style={styles.hint}>This number will receive SMS alerts.</Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passInputWrapper}>
              <TextInput style={styles.passInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showPass} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passInputWrapper}>
              <TextInput style={styles.passInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPass} />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleChangePassword}>
            <Text style={styles.secondaryBtnText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '700', color: COLORS.textPrimary },

  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg },

  avatarContainer: { alignItems: 'center', marginTop: SPACING.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  avatarText: { fontSize: FONTS.xxxl, fontWeight: '800', color: COLORS.primary },

  section: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  sectionTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },

  field: { gap: 6 },
  label: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, paddingHorizontal: 14,
    height: 48, fontSize: FONTS.md, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  hint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  passInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, paddingHorizontal: 14,
    height: 48, borderWidth: 1, borderColor: COLORS.border,
  },
  passInput: { flex: 1, fontSize: FONTS.md, color: COLORS.textPrimary },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: FONTS.md, fontWeight: '700' },

  secondaryBtn: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    height: 48, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary, marginTop: 8,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: FONTS.md, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: `${COLORS.danger}15`, borderRadius: RADIUS.md,
    height: 52, borderWidth: 1, borderColor: `${COLORS.danger}30`,
  },
  logoutBtnText: { color: COLORS.danger, fontSize: FONTS.md, fontWeight: '700' },
});
