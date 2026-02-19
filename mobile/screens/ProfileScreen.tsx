/**
 * ProfileScreen — Edit user profile fields
 * Progressive profile building via scrollable form
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import Card from '../components/ui/Card';
import type { RootStackParamList, UserRole, FarmingType } from '../types';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'extension_worker', label: 'Extension Worker' },
];

const FARMING_TYPE_OPTIONS: { value: FarmingType; label: string; icon: string }[] = [
  { value: 'agriculture', label: 'Agriculture', icon: 'leaf' },
  { value: 'horticulture', label: 'Horticulture', icon: 'flower' },
  { value: 'dairy', label: 'Dairy', icon: 'water' },
  { value: 'livestock', label: 'Livestock', icon: 'paw' },
  { value: 'poultry', label: 'Poultry', icon: 'egg' },
  { value: 'aquaculture', label: 'Aquaculture', icon: 'fish' },
];

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useApp();
  const { profile, updateProfile } = useProfile();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gender, setGender] = useState<string>(profile?.gender || '');
  const [role, setRole] = useState<UserRole>(profile?.role || 'farmer');
  const [farmingTypes, setFarmingTypes] = useState<FarmingType[]>(profile?.farmingTypes || []);
  const [isSaving, setIsSaving] = useState(false);
  const initializedRef = useRef(false);

  // Only sync from profile context on first mount — not on every profile update,
  // which would overwrite the user's in-progress edits.
  useEffect(() => {
    if (profile && !initializedRef.current) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setRole(profile.role || 'farmer');
      setFarmingTypes(profile.farmingTypes || []);
      initializedRef.current = true;
    }
  }, [profile]);

  const toggleFarmingType = (type: FarmingType) => {
    setFarmingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        gender: (gender as 'male' | 'female' | 'other') || undefined,
        role,
        farmingTypes,
      });
      if (success) {
        showSuccess('Profile updated');
        navigation.goBack();
      } else {
        showError('Failed to update profile');
      }
    } catch {
      showError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Profile"
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

      {/* Name */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
        <Card>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />
        </Card>
      </View>

      {/* Phone */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Phone (optional)</Text>
        <Card>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 XXXXX XXXXX"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
          />
        </Card>
      </View>

      {/* Gender */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Gender</Text>
        <View style={styles.chipRow}>
          {['male', 'female', 'other'].map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.chip,
                {
                  backgroundColor: gender === g ? theme.accent + '20' : theme.surface,
                  borderColor: gender === g ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: gender === g ? theme.accent : theme.text },
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Role */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Role</Text>
        <View style={styles.chipRow}>
          {ROLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setRole(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: role === opt.value ? theme.accent + '20' : theme.surface,
                  borderColor: role === opt.value ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: role === opt.value ? theme.accent : theme.text },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Farming Types */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Farming Activities</Text>
        <View style={styles.chipRow}>
          {FARMING_TYPE_OPTIONS.map((opt) => {
            const selected = farmingTypes.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => toggleFarmingType(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accent + '20' : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? theme.accent : theme.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: SPACING['3xl'] },
  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: TYPOGRAPHY.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  saveButton: {
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});
