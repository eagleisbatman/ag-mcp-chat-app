/**
 * MyFarmersScreen — List of farmers connected to this Extension Worker.
 * Allows starting a connected chat session on behalf of a farmer.
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
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import AppIcon from '../components/ui/AppIcon';
import { getMyFarmers } from '../services/db';
import type { RootStackParamList, FarmerEwMapping } from '../types';

interface MyFarmersScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyFarmers'>;
}

export default function MyFarmersScreen({ navigation }: MyFarmersScreenProps) {
  const { theme } = useApp();
  const { showError } = useToast();
  const [farmers, setFarmers] = useState<FarmerEwMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadFarmers();
    }, [])
  );

  const loadFarmers = async () => {
    setIsLoading(true);
    const result = await getMyFarmers();
    if (result.success && result.data) {
      setFarmers(result.data);
    } else {
      showError(result.error || 'Failed to load farmers');
    }
    setIsLoading(false);
  };

  const handleChatOnBehalf = (mapping: FarmerEwMapping) => {
    if (!mapping.farmer?.deviceId) return;
    navigation.navigate('Chat', {
      newSession: true,
      onBehalfOfDeviceId: mapping.farmer.deviceId,
    });
  };

  const renderFarmer = ({ item }: { item: FarmerEwMapping }) => {
    const farmer = item.farmer;
    const name = farmer?.name || farmer?.phone || 'Unknown Farmer';
    const isProxy = farmer?.isProxy;
    const completeness = farmer?.profileCompleteness || 0;

    return (
      <Card style={styles.card}>
        <TouchableOpacity
          style={styles.farmerRow}
          onPress={() => handleChatOnBehalf(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: theme.accent + '20' }]}>
            <AppIcon
              name={isProxy ? 'person-outline' : 'person'}
              size={20}
              color={theme.accent}
            />
          </View>
          <View style={styles.farmerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.farmerName, { color: theme.text }]} numberOfLines={1}>
                {name}
              </Text>
              {isProxy && (
                <View style={[styles.proxyBadge, { backgroundColor: theme.warning + '20' }]}>
                  <Text style={[styles.proxyText, { color: theme.warning }]}>Proxy</Text>
                </View>
              )}
            </View>
            {farmer?.phone && (
              <Text style={[styles.farmerPhone, { color: theme.textMuted }]}>
                {farmer.phone}
              </Text>
            )}
            {completeness > 0 && completeness < 100 && (
              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${completeness}%`, backgroundColor: theme.accent },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.textMuted }]}>
                  {completeness}%
                </Text>
              </View>
            )}
          </View>
          <AppIcon name="chatbubble-outline" size={20} color={theme.accent} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="My Farmers"
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel="Back"
          />
        }
        right={
          <IconButton
            icon="person-add"
            onPress={() => navigation.navigate('ConnectFarmer')}
            backgroundColor="transparent"
            color={theme.accent}
            accessibilityLabel="Connect farmer"
          />
        }
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : farmers.length === 0 ? (
        <View style={styles.centered}>
          <AppIcon name="people-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No farmers connected</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Connect with farmers to assist them via the app
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent }]}
            onPress={() => navigation.navigate('ConnectFarmer')}
            activeOpacity={0.8}
          >
            <AppIcon name="person-add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Connect a Farmer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={farmers}
          renderItem={renderFarmer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={loadFarmers}
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
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  farmerName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  proxyBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: 6,
  },
  proxyText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  farmerPhone: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: SPACING.xs,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.medium,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  addButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
