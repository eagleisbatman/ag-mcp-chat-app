/**
 * PendingRequestsScreen — Shows pending farmer-EW connection requests.
 * Farmers can approve/reject; EWs can see pending status.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import AppIcon from '../components/ui/AppIcon';
import { getPendingMappings, respondToMapping } from '../services/db';
import type { RootStackParamList, FarmerEwMapping } from '../types';

interface PendingRequestsScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PendingRequests'>;
}

export default function PendingRequestsScreen({ navigation }: PendingRequestsScreenProps) {
  const { theme } = useApp();
  const { profile } = useProfile();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState<FarmerEwMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const isEW = profile?.role === 'extension_worker';

  useFocusEffect(
    useCallback(() => {
      loadPending();
    }, [])
  );

  const loadPending = async () => {
    setIsLoading(true);
    const result = await getPendingMappings();
    if (result.success && result.data) {
      setRequests(result.data);
    } else {
      showError(result.error || 'Failed to load requests');
    }
    setIsLoading(false);
  };

  const handleRespond = async (mappingId: string, status: 'approved' | 'rejected') => {
    setRespondingId(mappingId);
    const result = await respondToMapping(mappingId, status);
    if (result.success) {
      showSuccess(status === 'approved' ? 'Connection approved' : 'Connection rejected');
      setRequests((prev) => prev.filter((r) => r.id !== mappingId));
    } else {
      showError(result.error || 'Failed to respond');
    }
    setRespondingId(null);
  };

  const renderRequest = ({ item }: { item: FarmerEwMapping }) => {
    const isResponding = respondingId === item.id;
    const otherName = isEW
      ? item.farmer?.name || item.farmer?.phone || 'Unknown Farmer'
      : item.ew?.name || item.ew?.phone || 'Unknown EW';
    const otherRole = isEW ? 'Farmer' : 'Extension Worker';

    return (
      <Card style={styles.card}>
        <View style={styles.requestRow}>
          <View style={[styles.avatar, { backgroundColor: theme.accent + '20' }]}>
            <AppIcon name="person" size={18} color={theme.accent} />
          </View>
          <View style={styles.requestInfo}>
            <Text style={[styles.requestName, { color: theme.text }]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={[styles.requestRole, { color: theme.textMuted }]}>{otherRole}</Text>
            {item.organization?.name && (
              <Text style={[styles.orgName, { color: theme.textMuted }]}>
                {item.organization.name}
              </Text>
            )}
          </View>
        </View>

        {/* Only farmers can approve/reject */}
        {!isEW && (
          <View style={styles.actionRow}>
            {isResponding ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton, { borderColor: theme.error }]}
                  onPress={() => handleRespond(item.id, 'rejected')}
                  activeOpacity={0.7}
                >
                  <AppIcon name="close" size={16} color={theme.error} />
                  <Text style={[styles.actionText, { color: theme.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton, { backgroundColor: theme.accent }]}
                  onPress={() => handleRespond(item.id, 'approved')}
                  activeOpacity={0.7}
                >
                  <AppIcon name="checkmark" size={16} color="#fff" />
                  <Text style={[styles.actionText, { color: '#fff' }]}>Approve</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {isEW && (
          <View style={styles.pendingRow}>
            <Text style={[styles.pendingText, { color: theme.warning }]}>
              Awaiting farmer approval
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Pending Requests"
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Back"
          />
        }
        right={<View />}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <AppIcon name="checkmark-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No pending requests</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            All connection requests have been handled
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={loadPending}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  card: { marginBottom: 0 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.sm,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  requestName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  requestRole: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 1,
  },
  orgName: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontStyle: 'italic',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.md,
    paddingTop: SPACING.xs,
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    gap: 4,
  },
  rejectButton: {
    borderWidth: 1,
  },
  approveButton: {},
  actionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  pendingRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  pendingText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontStyle: 'italic',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
  },
});
