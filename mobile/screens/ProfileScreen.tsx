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
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useApp } from '../contexts/AppContext';
import { useProfile } from '../contexts/app/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import Card from '../components/ui/Card';
import CountryCodePicker, { usePersistedCountryCode } from '../components/phone/CountryCodePicker';
import { uploadImage } from '../services/upload';
import { t } from '../constants/strings';
import type { RootStackParamList, UserRole, FarmingType } from '../types';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
}

const ROLE_OPTIONS: { value: UserRole; labelKey: string }[] = [
  { value: 'farmer', labelKey: 'profile.roleFarmer' },
  { value: 'extension_worker', labelKey: 'profile.roleExtensionWorker' },
];

const FARMING_TYPE_OPTIONS: { value: FarmingType; labelKey: string; icon: string }[] = [
  { value: 'agriculture', labelKey: 'profile.agriculture', icon: 'leaf' },
  { value: 'horticulture', labelKey: 'profile.horticulture', icon: 'flower' },
  { value: 'dairy', labelKey: 'profile.dairy', icon: 'water' },
  { value: 'livestock', labelKey: 'profile.livestock', icon: 'paw' },
  { value: 'poultry', labelKey: 'profile.poultry', icon: 'egg' },
  { value: 'aquaculture', labelKey: 'profile.aquaculture', icon: 'fish' },
];

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useApp();
  const { profile, updateProfile } = useProfile();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [countryCode, setCountryCode] = usePersistedCountryCode('KE');
  const [gender, setGender] = useState<string>(profile?.gender || '');
  const [role, setRole] = useState<UserRole>(profile?.role || 'farmer');
  const [farmingTypes, setFarmingTypes] = useState<FarmingType[]>(profile?.farmingTypes || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureUrl, setPictureUrl] = useState<string | null>(profile?.profilePictureUrl ?? null);
  const initializedRef = useRef(false);
  const completeness = Math.max(0, Math.min(100, profile?.profileCompleteness ?? 0));

  // Only sync from profile context on first mount — not on every profile update,
  // which would overwrite the user's in-progress edits.
  useEffect(() => {
    if (profile && !initializedRef.current) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setRole(profile.role || 'farmer');
      setFarmingTypes(profile.farmingTypes || []);
      setPictureUrl(profile.profilePictureUrl ?? null);
      // Try to detect country from stored phone number
      if (profile.phone) {
        const parsed = parsePhoneNumberFromString(profile.phone);
        if (parsed?.country) {
          setCountryCode(parsed.country);
        }
      }
      initializedRef.current = true;
    }
  }, [profile]);

  const handlePickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(t('media.photoLibraryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.base64) return;

      Haptics.selectionAsync();
      setIsUploadingPicture(true);

      const uploadResult = await uploadImage(result.assets[0].base64, 'ag-mcp/profiles');
      if (uploadResult.success && uploadResult.url) {
        setPictureUrl(uploadResult.url);
        // Save immediately so user sees the change without pressing Save
        await updateProfile({ profilePictureUrl: uploadResult.url });
        showSuccess(t('profile.pictureUpdated'));
      } else {
        showError(t('profile.pictureUploadFailed'));
      }
    } catch {
      showError(t('profile.pictureUploadFailed'));
    } finally {
      setIsUploadingPicture(false);
    }
  };

  /** Build initials for fallback avatar */
  const initials = (name || 'U').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const toggleFarmingType = (type: FarmingType) => {
    setFarmingTypes((prev) =>
      prev.includes(type) ? prev.filter((ft) => ft !== type) : [...prev, type]
    );
  };

  const doSave = async () => {
    setIsSaving(true);
    try {
      // Format phone to E.164 using country code
      let formattedPhone: string | undefined;
      if (phone.trim()) {
        const parsed = parsePhoneNumberFromString(phone.trim(), countryCode);
        formattedPhone = parsed?.isValid() ? parsed.format('E.164') : phone.trim();
      }

      const success = await updateProfile({
        name: name.trim() || undefined,
        phone: formattedPhone,
        gender: (gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || undefined,
        farmingTypes,
      });
      if (success) {
        showSuccess(t('profile.profileUpdated'));
        navigation.goBack();
      } else {
        showError(t('profile.profileUpdateFailed'));
      }
    } catch {
      showError(t('profile.profileUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    doSave();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title={t('profile.title')}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={<View />}
      />

      {/* Profile Picture Avatar */}
      <View style={[styles.section, { marginTop: SPACING.lg, alignItems: 'center' }]}>
        <Pressable onPress={handlePickProfilePicture} disabled={isUploadingPicture} style={styles.avatarContainer}>
          {pictureUrl ? (
            <Image source={{ uri: pictureUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accent + '30' }]}>
              <Text style={[styles.avatarInitials, { color: theme.accent }]}>{initials}</Text>
            </View>
          )}
          {isUploadingPicture ? (
            <View style={[styles.cameraBadge, { backgroundColor: theme.surface }]}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : (
            <View style={[styles.cameraBadge, { backgroundColor: theme.accent }]}>
              <AppIcon name="camera" size={14} color="#fff" prefer="feather" />
            </View>
          )}
        </Pressable>
      </View>

      {/* Profile Completeness */}
      <View style={[styles.section, { marginTop: SPACING.md }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
          <Text style={[styles.label, { color: theme.textMuted, marginBottom: 0 }]}>
            {t('profile.completeness')}
          </Text>
          <Text style={{ color: theme.accent, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold }}>
            {completeness}%
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: theme.surface, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${completeness}%`, backgroundColor: theme.accent, borderRadius: 3 }} />
        </View>
      </View>

      {/* Name */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('profile.name')}</Text>
        <Card>
          <TextInput
            testID="profile-name"
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            accessibilityLabel={t('profile.name')}
          />
        </Card>
      </View>

      {/* Phone */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('profile.phone')}</Text>
        <CountryCodePicker
          countryCode={countryCode}
          onCountryChange={setCountryCode}
          phone={phone}
          onPhoneChange={setPhone}
        />
      </View>

      {/* Gender */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('profile.gender')}</Text>
        <View style={styles.chipRow}>
          {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
            <TouchableOpacity
              key={g}
              testID={`profile-gender-${g}`}
              onPress={() => setGender(g)}
              accessibilityRole="radio"
              accessibilityState={{ selected: gender === g }}
              accessibilityLabel={t(`profile.${g}`)}
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
                {t(`profile.${g}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Role (read-only — set via voice conversation with EW verification) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('profile.role')}</Text>
        <View style={styles.chipRow}>
          {ROLE_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              testID={`profile-role-${opt.value}`}
              accessibilityRole="text"
              style={[
                styles.chip,
                {
                  backgroundColor: role === opt.value ? theme.accent + '20' : theme.surface,
                  borderColor: role === opt.value ? theme.accent : theme.border,
                  opacity: role === opt.value ? 1 : 0.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: role === opt.value ? theme.accent : theme.text },
                ]}
              >
                {t(opt.labelKey)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.roleHint, { color: theme.textMuted }]}>
          {t('profile.roleHint')}
        </Text>
      </View>

      {/* Farming Types */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('profile.farmingActivities')}</Text>
        <View style={styles.chipRow}>
          {FARMING_TYPE_OPTIONS.map((opt) => {
            const selected = farmingTypes.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => toggleFarmingType(opt.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(opt.labelKey)}
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
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          testID="profile-save"
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={t('profile.save')}
          accessibilityState={{ disabled: isSaving }}
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t('profile.saveProfile')}</Text>
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
  roleHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
