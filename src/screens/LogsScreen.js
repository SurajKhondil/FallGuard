import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import EventCard from '../components/EventCard';

const FILTERS = ['All', 'FALL', 'NORMAL', 'NO_PERSON'];

export default function LogsScreen() {
  const { logs, logsLoaded, clearLogs } = useApp();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchFilter = activeFilter === 'All' || log.type === activeFilter;
      const matchQuery = query === '' || log.type.toLowerCase().includes(query.toLowerCase()) ||
        log.timestamp.includes(query);
      return matchFilter && matchQuery;
    });
  }, [logs, query, activeFilter]);

  const exportCSV = async () => {
    if (logs.length === 0) {
      Alert.alert('No Data', 'There are no events to export.');
      return;
    }

    try {
      let csvContent = 'ID,Type,Confidence,Timestamp,Source\n';
      logs.forEach(log => {
        csvContent += `${log.id},${log.type},${log.confidence},${log.timestamp},${log.source}\n`;
      });

      const fileUri = `${FileSystem.documentDirectory}FallGuard_Logs_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing Unavailable', 'Cannot share the CSV file on this device.');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while generating the CSV file.');
      console.error(error);
    }
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptyDesc}>
        {logs.length === 0
          ? 'Start detection from the Dashboard to see events here.'
          : 'No events match your current filter.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Event Logs</Text>
          <Text style={styles.subtitle}>{logs.length} total event{logs.length !== 1 ? 's' : ''}</Text>
        </View>
        {logs.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Ionicons name="download-outline" size={16} color={COLORS.primary} />
              <Text style={styles.exportText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearLogs}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const colors = {
            All: COLORS.primary,
            FALL: COLORS.danger,
            NORMAL: COLORS.success,
            NO_PERSON: COLORS.textSecondary,
          };
          const c = colors[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, isActive && { backgroundColor: `${c}20`, borderColor: `${c}60` }]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, isActive ? { color: c } : { color: COLORS.textMuted }]}>
                {f === 'NO_PERSON' ? 'No Person' : f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
  },
  title: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  exportText: { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: '700' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${COLORS.danger}15`, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: `${COLORS.danger}30`,
  },
  clearText: { color: COLORS.danger, fontSize: FONTS.sm, fontWeight: '600' },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.md },

  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterText: { fontSize: FONTS.sm, fontWeight: '600' },

  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },

  empty: {
    alignItems: 'center', paddingTop: 80, gap: 12,
  },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.textPrimary },
  emptyDesc: {
    fontSize: FONTS.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.xl,
  },
});
