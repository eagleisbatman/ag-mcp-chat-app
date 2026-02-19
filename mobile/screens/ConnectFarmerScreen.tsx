/**
 * ConnectFarmerScreen — EW enters a farmer's phone number to create a connection.
 * Supports connecting to existing farmers or creating proxy profiles.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import AppIcon from '../components/ui/AppIcon';
import { connectFarmer } from '../services/db';
import type { RootStackParamList } from '../types';

interface ConnectFarmerScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ConnectFarmer'>;
}

export default function ConnectFarmerScreen({ navigation }: ConnectFarmerScreenProps) {
  const { theme } = useApp();
  const { showSuccess, showError } = useToast();
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidPhone = /^[+]?[\d\s\-()]{8,}$/.test(phone.trim());

  const handleConnect = async () => {
    if (!isValidPhone) return;
    setIsSubmitting(true);
    try {
      const result = await connectFarmer(phone.trim());
      if (result.success) {
        showSuccess('Connection request sent');
        navigation.goBack();
      } else {
        if (result.error?.includes('already exists')) {
          showError('Already connected to this farmer');
        } else {
          showError(result.error || 'Failed to connect');
        }
      }
    } catch {
      showError('Failed to connect');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Connect Farmer"
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

      <View style={styles.content}>
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
            <AppIcon name="people" size={32} color={theme.accent} />
          </View>
        </View>

        <Text style={[styles.description, { color: theme.textMuted }]}>
          Enter the farmer's phone number to connect. If they don't have the app yet, a proxy
          profile will be created that merges when they sign up.
        </Text>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.textMuted }]}>PHONE NUMBER</Text>
          <Card>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+254 7XX XXX XXX"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              autoFocus
            />
          </Card>
        </View>

        <TouchableOpacity
          style={[
            styles.connectButton,
            { backgroundColor: isValidPhone ? theme.accent : theme.border },
          ]}
          onPress={handleConnect}
          disabled={!isValidPhone || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <AppIcon name="link" size={18} color="#fff" />
              <Text style={styles.connectButtonText}>Connect</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppIcon name="information-circle-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            The farmer will receive a connection request. Once approved, you can chat on their behalf
            and manage their farm data.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  iconRow: { alignItems: 'center', marginBottom: SPACING.lg },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  formSection: { marginBottom: SPACING.xl },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    letterSpacing: 1,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: 18,
  },
});
