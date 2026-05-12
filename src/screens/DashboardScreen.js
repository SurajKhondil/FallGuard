import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AlertModal from '../components/AlertModal';
import ConfidenceBar from '../components/ConfidenceBar';
import DetectionStatusPanel from '../components/DetectionStatusPanel';
import LiveActivityGraph from '../components/LiveActivityGraph';
import { useApp } from '../context/AppContext';
import { useDetection } from '../hooks/useDetection';
import { api } from '../services/api';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

const { width } = Dimensions.get('window');

// Download a report CSV from the server then share it as a local file
async function downloadAndShare(httpUrl, filename) {
  try {
    const localUri = FileSystem.cacheDirectory + filename;
    const { status } = await FileSystem.downloadAsync(httpUrl, localUri);
    if (status !== 200) throw new Error(`Download failed (status ${status})`);
    await Sharing.shareAsync(localUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Save / Share Report',
      UTI: 'public.comma-separated-values-text',
    });
  } catch (err) {
    Alert.alert('Download Failed', `Could not download report: ${err.message}`);
  }
}

export default function DashboardScreen({ navigation }) {
  const {
    user, detectionStatus, isMonitoring, setIsMonitoring,
    currentConfidence, setDetectionStatus, setCurrentConfidence,
    activeAlert, dismissAlert, mode, changeMode,
    logs, reports, addReport, deleteReport, refreshReports, handleDetectionEvent,
  } = useApp();
  const { startMonitoring, stopMonitoring, triggerFall, triggerNormal } = useDetection();

  const [permission, requestPermission] = useCameraPermissions();
  const [videoUri, setVideoUri] = useState(null);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [annotatedFrame, setAnnotatedFrame] = useState(null); // base64 JPEG with landmarks drawn by server
  const [cameraReady, setCameraReady] = useState(false);      // true once CameraView fires onCameraReady
  const [isUploading, setIsUploading] = useState(false);       // prevents duplicate video uploads

  const headerAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef(null);           // ref to CameraView for frame capture
  const frameIntervalRef = useRef(null);    // interval handle
  const sessionStartRef = useRef(Date.now() / 1000); // session timestamp base
  const isCapturingRef = useRef(false);     // mutex: prevents concurrent takePictureAsync calls

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // ── Real-time frame capture loop ──────────────────────────
  // Fires every 1.5s while monitoring AND camera is ready inside the modal.
  // Waits for onCameraReady before first capture to prevent Android crash.
  useEffect(() => {
    const shouldCapture = isMonitoring && cameraModalVisible && cameraReady;

    if (shouldCapture) {
      sessionStartRef.current = Date.now() / 1000;

      // Small delay so camera sensor stabilizes after onCameraReady
      const startTimeout = setTimeout(() => {
        frameIntervalRef.current = setInterval(async () => {
          // Skip if a previous capture+API call is still in progress
          if (!cameraRef.current || !cameraReady || isCapturingRef.current) return;
          isCapturingRef.current = true;
          try {
            // NOTE: skipProcessing removed — causes silent failures on Android
            const photo = await cameraRef.current.takePictureAsync({
              base64: true,
              quality: 0.3,   // Lower quality = faster upload + less server load
            });
            if (!photo?.base64) { isCapturingRef.current = false; return; }

            const timestamp = Date.now() / 1000 - sessionStartRef.current;
            const result = await api.detectFrame(photo.base64, user?.id, timestamp);

            // Map server event to app status
            const eventMap = {
              CONFIRMED_FALL: 'FALL',
              FALL_DETECTED: 'FALL',
              NORMAL: 'NORMAL',
              NO_PERSON: 'NO_PERSON',
            };
            const appType = eventMap[result.event] || 'NORMAL';
            setDetectionStatus(appType);
            setCurrentConfidence(result.confidence || 0);

            // Display the skeleton-annotated frame returned by MediaPipe server
            if (result.annotated_frame) {
              setAnnotatedFrame(`data:image/jpeg;base64,${result.annotated_frame}`);
            }

            // On confirmed fall — trigger full alert + log to DB
            if (result.event === 'CONFIRMED_FALL') {
              handleDetectionEvent({
                id: `cam_${Date.now()}`,
                type: 'FALL',
                timestamp: new Date().toISOString(),
                confidence: result.confidence || 0.9,
                source: 'live_camera',
              });
            }
          } catch (err) {
            console.warn('[Camera] Frame skip:', err.message);
          } finally {
            isCapturingRef.current = false;  // always release mutex
          }
        }, 1000); // 1s interval — gives server time to process MediaPipe
      }, 800); // 800ms grace period for camera sensor to stabilize

      return () => {
        clearTimeout(startTimeout);
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
      };

    } else {
      // Stop capturing
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      // Clear annotated frame when done
      if (!isMonitoring) {
        setAnnotatedFrame(null);
        // Reset server detector when monitoring stops
        if (user?.id) api.resetDetector(user.id);
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isMonitoring, cameraModalVisible, cameraReady, user, handleDetectionEvent, setDetectionStatus, setCurrentConfidence]);

  useEffect(() => {
    if (isMonitoring) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
    }
  }, [isMonitoring]);

  const toggleMonitoring = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isMonitoring) {
      stopMonitoring();
    } else {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert("Permission Denied", "Camera permission is required to start detection.");
          return;
        }
      }
      setVideoUri(null); // Clear video if switching to live camera
      startMonitoring();
    }
  };

  const pickVideo = async () => {
    // Guard: prevent duplicate uploads if user taps multiple times
    if (isUploading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const videoUri = result.assets[0].uri;
      setVideoUri(videoUri);
      setIsUploading(true); // Lock button until upload completes

      // Stop live monitoring if active
      if (isMonitoring) stopMonitoring();

      Alert.alert(
        '🤖 AI Analysis Started',
        'Uploading video to AI server. This may take 10–30 seconds depending on video length...'
      );

      try {
        // ── Real AI analysis via Team 1 Flask endpoint ──
        const data = await api.uploadVideo(videoUri, user?.id);
        const fallDetected = data.fall_detected;
        const events = data.events || [];
        const aiUsed = data.ai_used;

        if (fallDetected) {
          triggerFall();

          const firstFall = events.find(e => e.event === 'CONFIRMED_FALL');
          const fallTime = firstFall ? `at ${firstFall.time_sec}s` : '';
          const direction = firstFall?.direction || '';

          // Refresh reports list from DB immediately
          await refreshReports();

          Alert.alert(
            '⚠️ Fall Detected!',
            `A confirmed fall was detected ${fallTime}${direction ? ` (${direction})` : ''}. Report saved to your dashboard.`,
            [
              {
                text: 'View Report',
                onPress: () => {
                  if (user?.id) {
                    api.getReports(user.id).then(rpts => {
                      if (Array.isArray(rpts) && rpts.length > 0) {
                        const latest = rpts[0];
                        // latest.uri is now an HTTP URL — download then share
                        if (latest.uri) {
                          downloadAndShare(latest.uri, latest.name);
                        }
                      }
                    }).catch(() => { });
                  }
                }
              },
              { text: 'OK', style: 'cancel' }
            ]
          );
        } else {
          triggerNormal();
          // Refresh even on no-fall (report is still saved)
          await refreshReports();
          Alert.alert(
            '✅ No Fall Detected',
            `AI analysis complete${aiUsed ? ' (MediaPipe)' : ' (simulation)'}. No falls were found in this video.`
          );
        }
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert(
          'Analysis Failed',
          `Could not analyze video: ${error.message}\n\nMake sure Flask server is running.`
        );
      } finally {
        setIsUploading(false); // Always unlock button
      }
    }
  };


  const recentFalls = logs.filter((l) => l.type === 'FALL').length;
  const totalEvents = logs.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AlertModal event={activeAlert} onDismiss={dismissAlert} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'User'} 👋</Text>
            <Text style={styles.subtitle}>Fall Detection Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Profile');
          }}>
            <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="layers-outline" label="Total Events" value={totalEvents} color={COLORS.primary} />
          <StatCard icon="warning-outline" label="Falls Detected" value={recentFalls} color={COLORS.danger} />
          <StatCard
            icon="analytics-outline"
            label="Fall Rate"
            value={totalEvents > 0 ? `${((recentFalls / totalEvents) * 100).toFixed(0)}%` : '0%'}
            color={COLORS.warning}
          />
        </View>

        {/* Camera Feed */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeader}>
            <Text style={styles.sectionTitle}>Camera Feed</Text>
            <View style={[styles.modeBadge, { backgroundColor: isMonitoring ? `${COLORS.danger}20` : `${COLORS.textMuted}20` }]}>
              <View style={[styles.modeDot, { backgroundColor: isMonitoring ? COLORS.danger : COLORS.textMuted }]} />
              <Text style={[styles.modeText, { color: isMonitoring ? COLORS.danger : COLORS.textMuted }]}>
                {isMonitoring ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          {/* Camera View / Placeholder */}
          <View style={styles.cameraView}>
            {isMonitoring && !videoUri ? (
              <View style={styles.cameraActive}>
                <Ionicons name="scan-circle" size={40} color={COLORS.primary} />
                <Text style={styles.cameraActiveText}>Live Feed Available</Text>
                <TouchableOpacity
                  style={styles.openCameraBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCameraReady(false); // reset so next open waits for onCameraReady
                    setCameraModalVisible(true);
                  }}
                >
                  <Ionicons name="expand" size={18} color="#FFF" />
                  <Text style={styles.openCameraBtnText}>Open Live Monitoring Camera</Text>
                </TouchableOpacity>
              </View>
            ) : isMonitoring && videoUri ? (
              <View style={styles.fullCamera}>
                {/* Processing Uploaded Video */}
                <View style={styles.scanCornerTL} />
                <View style={styles.scanCornerTR} />
                <View style={styles.scanCornerBL} />
                <View style={styles.scanCornerBR} />
                <View style={styles.cameraActive}>
                  <Ionicons name="film" size={40} color={COLORS.primary} />
                  <Text style={styles.cameraActiveText}>Processing Uploaded Video</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.scanCornerTL} />
                <View style={styles.scanCornerTR} />
                <View style={styles.scanCornerBL} />
                <View style={styles.scanCornerBR} />
                <View style={styles.cameraIdle}>
                  <Ionicons name="videocam-off" size={40} color={COLORS.textMuted} />
                  <Text style={styles.cameraIdleText}>Camera Standby</Text>
                  <Text style={styles.cameraSubText}>Press Start Detection to begin</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Live Camera Fullscreen Modal */}
        <Modal visible={cameraModalVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vertical Scanning Mode</Text>
              <TouchableOpacity onPress={() => setCameraModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalCameraWrapper}>
              {permission?.granted ? (
                <View style={{ flex: 1 }}>
                  {/* CameraView — onCameraReady ensures we don't capture before sensor is live */}
                  <CameraView
                    ref={cameraRef}
                    style={styles.modalCamera}
                    facing={cameraFacing}
                    onCameraReady={() => setCameraReady(true)}
                  />

                  {/* Annotated frame overlay: shows MediaPipe landmark skeleton from server */}
                  {annotatedFrame ? (
                    <Image
                      source={{ uri: annotatedFrame }}
                      style={styles.annotatedOverlay}
                      resizeMode="stretch"
                    />
                  ) : null}

                  <View style={styles.absoluteOverlay}>
                    <View style={styles.scanBox}>
                      <View style={styles.scanCornerTL} />
                      <View style={styles.scanCornerTR} />
                      <View style={styles.scanCornerBL} />
                      <View style={styles.scanCornerBR} />

                      {isMonitoring && !annotatedFrame && (
                        <Animated.View style={[
                          styles.laserLine,
                          { transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-250, 250] }) }] }
                        ]} />
                      )}

                      <Text style={styles.scanOverlayText}>
                        {isMonitoring ? (annotatedFrame ? '🦴 Landmark Detection Active' : 'Waiting for pose...') : 'Paused'}
                      </Text>
                    </View>
                  </View>

                  {/* Real-time AI Status Bar */}
                  <View style={styles.aiStatusBar}>
                    <View style={[
                      styles.aiStatusDot,
                      {
                        backgroundColor:
                          detectionStatus === 'FALL' ? '#F85149' :
                            detectionStatus === 'NORMAL' ? '#3FB950' : '#8B949E'
                      }
                    ]} />
                    <Text style={styles.aiStatusText}>
                      {detectionStatus === 'FALL' ? '⚠️ FALL DETECTED' :
                        detectionStatus === 'NORMAL' ? '✅ NORMAL' :
                          detectionStatus === 'NO_PERSON' ? '👤 NO PERSON' : '🔍 SCANNING'}
                    </Text>
                    {currentConfidence > 0 && (
                      <Text style={styles.aiConfText}>
                        {(currentConfidence * 100).toFixed(0)}%
                      </Text>
                    )}
                  </View>

                  {/* Flip Camera Button */}
                  <TouchableOpacity
                    style={styles.flipCameraBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCameraFacing(f => f === 'back' ? 'front' : 'back');
                    }}
                  >
                    <Ionicons name="camera-reverse" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraIdle}>
                  <Text style={styles.cameraIdleText}>No Camera Access</Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <DetectionStatusPanel
                status={detectionStatus}
                confidence={currentConfidence}
                isMonitoring={isMonitoring}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Detection Status */}
        <DetectionStatusPanel
          status={detectionStatus}
          confidence={currentConfidence}
          isMonitoring={isMonitoring}
        />

        {/* Confidence Bar */}
        {isMonitoring && currentConfidence > 0 && (
          <View style={styles.card}>
            <ConfidenceBar confidence={currentConfidence} label="AI Detection Confidence" />
          </View>
        )}

        {/* Live Activity Graph */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Real-time Sensor Feed</Text>
          <LiveActivityGraph isActive={isMonitoring} />
        </View>

        {/* Reports Section */}
        {reports?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.reportHeaderRow}>
              <Text style={styles.sectionTitle}>Analysis Reports</Text>
              <Text style={styles.reportCount}>{reports.length} file{reports.length > 1 ? 's' : ''}</Text>
            </View>
            {reports.slice(0, 5).map(report => (
              <View key={report.id} style={styles.reportItem}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <TouchableOpacity
                  style={{ flex: 1, marginLeft: 10 }}
                  onPress={() =>
                    Alert.alert(
                      report.name,
                      `Generated: ${new Date(report.date).toLocaleString()}`,
                      [
                        {
                          text: '🌐 Open in Browser',
                          onPress: () =>
                            Linking.openURL(report.uri).catch(() =>
                              Alert.alert('Cannot Open', 'Could not open URL. Try Share instead.')
                            ),
                        },
                        {
                          text: '📥 Download & Share',
                          onPress: () => downloadAndShare(report.uri, report.name),
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    )
                  }
                >
                  <Text style={styles.reportName}>{report.name}</Text>
                  <Text style={styles.reportDate}>{new Date(report.date).toLocaleString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Delete Report',
                      `Are you sure you want to delete "${report.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteReport(report.id) },
                      ]
                    )
                  }
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Main Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Detection Control</Text>

          <TouchableOpacity
            style={[styles.mainToggle, isMonitoring ? styles.stopToggle : styles.startToggle]}
            onPress={toggleMonitoring}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isMonitoring ? 'stop-circle' : 'play-circle'}
              size={28}
              color="#FFF"
            />
            <Text style={styles.mainToggleText}>
              {isMonitoring ? 'Stop Detection' : 'Start Detection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={pickVideo}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload" size={24} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Upload Video for Analysis</Text>
          </TouchableOpacity>

          {/* Manual triggers */}
          {isMonitoring && (
            <View style={styles.manualRow}>
              <Text style={styles.manualLabel}>Manual Triggers</Text>
              <View style={styles.manualBtns}>
                <TouchableOpacity style={styles.triggerBtnFall} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); triggerFall(); }} activeOpacity={0.8}>
                  <Ionicons name="warning" size={16} color={COLORS.danger} />
                  <Text style={styles.triggerTextFall}>Trigger Fall</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.triggerBtnNormal} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); triggerNormal(); }} activeOpacity={0.8}>
                  <Ionicons name="person" size={16} color={COLORS.success} />
                  <Text style={styles.triggerTextNormal}>Trigger Normal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Mode Switch */}
        <View style={styles.card}>
          <View style={styles.modeRow}>
            <View style={styles.modeInfo}>
              <Ionicons
                name={mode === 'simulation' ? 'flask' : 'wifi'}
                size={20}
                color={mode === 'simulation' ? COLORS.warning : COLORS.success}
              />
              <View>
                <Text style={styles.modeTitle}>
                  {mode === 'simulation' ? 'Simulation Mode' : 'Live Mode'}
                </Text>
                <Text style={styles.modeDesc}>
                  {mode === 'simulation' ? 'Using mock AI data' : 'Connected to live backend'}
                </Text>
              </View>
            </View>
            <Switch
              value={mode === 'live'}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                changeMode(v ? 'live' : 'simulation');
              }}
              trackColor={{ false: COLORS.bgInput, true: `${COLORS.success}60` }}
              thumbColor={mode === 'live' ? COLORS.success : COLORS.textMuted}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}30` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: 4, paddingBottom: 4,
  },
  greeting: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.sm, alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  statIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: FONTS.xl, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },

  cameraCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  cameraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONTS.md, fontWeight: '700' },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  modeDot: { width: 6, height: 6, borderRadius: 3 },
  modeText: { fontSize: FONTS.xs, fontWeight: '700', letterSpacing: 0.8 },

  cameraView: {
    height: 250, backgroundColor: '#0A0E13',
    borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, position: 'relative', overflow: 'hidden'
  },
  fullCamera: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  openCameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md,
    paddingVertical: 10, borderRadius: RADIUS.full, marginTop: 8,
  },
  openCameraBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONTS.sm },

  scanCornerTL: { position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: COLORS.primary, borderRadius: 2, zIndex: 10 },
  scanCornerTR: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: COLORS.primary, borderRadius: 2, zIndex: 10 },
  scanCornerBL: { position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: COLORS.primary, borderRadius: 2, zIndex: 10 },
  scanCornerBR: { position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: COLORS.primary, borderRadius: 2, zIndex: 10 },
  cameraActive: { alignItems: 'center', gap: 8, zIndex: 10 },
  cameraActiveText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.md },
  cameraIdle: { alignItems: 'center', gap: 8, zIndex: 10 },
  cameraIdleText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.md },
  cameraSubText: { color: COLORS.textMuted, fontSize: FONTS.sm },

  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, backgroundColor: COLORS.bgCard,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: FONTS.lg, fontWeight: '700' },
  closeModalBtn: { padding: 4 },
  modalCameraWrapper: { flex: 1, backgroundColor: '#000', overflow: 'hidden', position: 'relative' },
  modalCamera: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  annotatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,          // above camera, below UI controls
    opacity: 0.92,      // slight transparency so camera is still visible underneath
  },
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipCameraBtn: {
    position: 'absolute', bottom: 30, right: 30,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  scanBox: {
    width: '85%', height: '85%',
    borderWidth: 1, borderColor: 'rgba(9,105,218,0.3)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  scanOverlayText: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sm, fontWeight: '600', position: 'absolute', bottom: 20 },
  laserLine: {
    width: '100%', height: 2,
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 5,
    position: 'absolute',
  },
  modalFooter: { padding: SPACING.md, backgroundColor: COLORS.bgCard },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },

  reportHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  reportCount: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  reportItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  reportName: { color: COLORS.textPrimary, fontSize: FONTS.sm, fontWeight: '700' },
  reportDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  deleteBtn: {
    padding: 8,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.danger}10`,
    marginLeft: 8,
  },

  controlsSection: { gap: 12 },
  mainToggle: {
    borderRadius: RADIUS.md, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  startToggle: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
  },
  stopToggle: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  mainToggleText: { color: '#FFF', fontWeight: '800', fontSize: FONTS.lg },

  uploadBtn: {
    borderRadius: RADIUS.md, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  uploadBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.md },

  manualRow: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  manualLabel: { color: COLORS.textSecondary, fontSize: FONTS.sm, fontWeight: '600' },
  manualBtns: { flexDirection: 'row', gap: 10 },
  triggerBtnFall: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: `${COLORS.danger}18`, borderRadius: RADIUS.md,
    paddingVertical: 12, borderWidth: 1, borderColor: `${COLORS.danger}40`,
  },
  triggerTextFall: { color: COLORS.danger, fontWeight: '700', fontSize: FONTS.sm },
  triggerBtnNormal: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: `${COLORS.success}18`, borderRadius: RADIUS.md,
    paddingVertical: 12, borderWidth: 1, borderColor: `${COLORS.success}40`,
  },
  triggerTextNormal: { color: COLORS.success, fontWeight: '700', fontSize: FONTS.sm },

  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONTS.md },
  modeDesc: { color: COLORS.textSecondary, fontSize: FONTS.xs, marginTop: 2 },

  // ── Real-time AI Camera Status Bar ─────────────────
  aiStatusBar: {
    position: 'absolute', bottom: 70, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13,17,23,0.85)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(88,166,255,0.3)',
  },
  aiStatusDot: { width: 10, height: 10, borderRadius: 5 },
  aiStatusText: { flex: 1, color: '#FFF', fontWeight: '700', fontSize: 13 },
  aiConfText: { color: '#58A6FF', fontWeight: '800', fontSize: 13 },
});

