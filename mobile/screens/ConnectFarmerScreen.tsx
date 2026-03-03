/**
 * ConnectFarmerScreen — Multi-step EW flow to connect with a farmer.
 *
 * Steps:
 * 1. Enter farmer's phone number
 * 2. Send OTP → navigate to OtpVerificationScreen
 * 3. On return with verified OTP → show consent screen
 * 4. Farmer approves → create connection with farmerConsent=true
 *
 * For proxy farmers (no phone verification), skip OTP and create with farmerConsent=false.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import CountryCodePicker, { usePersistedCountryCode } from '../components/phone/CountryCodePicker';
import { connectFarmer } from '../services/db';
import { API_BASE_URL, API_KEY, ensureDeviceId } from '../services/api/core';
import { t } from '../constants/strings';
import type { RootStackParamList } from '../types';

type Step = 'phone' | 'consent';

interface ConnectFarmerScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ConnectFarmer'>;
  route: RouteProp<RootStackParamList, 'ConnectFarmer'>;
}

export default function ConnectFarmerScreen({ navigation, route }: ConnectFarmerScreenProps) {
  const { theme, profile } = useApp();
  const { showSuccess, showError } = useToast();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = usePersistedCountryCode('KE');
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<Step>('phone');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Available organizations from the EW's profile
  const orgs = profile?.organizationMemberships?.filter((m) => m.status === 'approved') ?? [];
  // Auto-select if only one org
  const effectiveOrgId = selectedOrgId || (orgs.length === 1 ? orgs[0].organizationId : undefined);

  // Validate phone using libphonenumber-js
  const parsed = phone.trim() ? parsePhoneNumberFromString(phone.trim(), countryCode) : null;
  const isValidPhone = parsed?.isValid() ?? false;

  // Listen for OTP verification result from OtpVerificationScreen
  useEffect(() => {
    const params = route.params;
    if (params?.otpVerified && params?.verifiedPhone) {
      setVerifiedPhone(params.verifiedPhone);
      setStep('consent');
    }
  }, [route.params]);

  /** Send OTP to the farmer's phone, then navigate to OTP verification screen */
  const handleSendOtp = async () => {
    if (!isValidPhone || !parsed || isSendingOtp) return;
    setIsSendingOtp(true);
    try {
      const e164Phone = parsed.format('E.164');
      const deviceId = await ensureDeviceId();
      const res = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ phone: e164Phone, purpose: 'ew_connect' }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (data.success) {
        navigation.navigate('OtpVerification', {
          phone: e164Phone,
          purpose: 'ew_connect',
        });
      } else {
        showError(data.error || t('otp.sendFailed') || 'Could not send OTP');
      }
    } catch {
      showError(t('otp.sendFailed') || 'Could not send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  /** Skip OTP — create proxy farmer without consent */
  const handleSkipOtp = async () => {
    if (!isValidPhone || !parsed) return;
    setIsSubmitting(true);
    try {
      const e164Phone = parsed.format('E.164');
      const result = await connectFarmer(e164Phone, effectiveOrgId, false);
      if (result.success) {
        showSuccess(t('extensionWorker.connectionRequestSent'));
        navigation.goBack();
      } else {
        if (result.error?.includes('already exists')) {
          showError(t('extensionWorker.alreadyConnected'));
        } else {
          showError(result.error || t('extensionWorker.connectionFailed'));
        }
      }
    } catch {
      showError(t('extensionWorker.connectionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Farmer approved consent — create connection with farmerConsent=true */
  const handleApproveConsent = async () => {
    if (!verifiedPhone || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await connectFarmer(verifiedPhone, effectiveOrgId, true);
      if (result.success) {
        showSuccess(t('extensionWorker.connectionRequestSent'));
        navigation.goBack();
      } else {
        if (result.error?.includes('already exists')) {
          showError(t('extensionWorker.alreadyConnected'));
        } else {
          showError(result.error || t('extensionWorker.connectionFailed'));
        }
      }
    } catch {
      showError(t('extensionWorker.connectionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Farmer declined consent */
  const handleDeclineConsent = () => {
    showError(t('consent.declined') || 'Connection declined.');
    setStep('phone');
    setVerifiedPhone(null);
  };

  const maskedPhone = verifiedPhone
    ? (verifiedPhone.length > 4 ? '***' + verifiedPhone.slice(-4) : verifiedPhone)
    : '';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={step === 'consent'
          ? (t('consent.title') || 'Connection Consent')
          : t('extensionWorker.connectFarmer')}
        left={
          <IconButton
            icon="arrow-back"
            onPress={() => {
              if (step === 'consent') {
                setStep('phone');
                setVerifiedPhone(null);
              } else {
                navigation.goBack();
              }
            }}
            backgroundColor="transparent"
            color={theme.text}
            accessibilityLabel={t('common.back')}
          />
        }
        right={<View />}
      />

      {step === 'phone' ? (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: SPACING['2xl'] }} keyboardShouldPersistTaps="handled">
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
              <AppIcon name="people" size={32} color={theme.accent} />
            </View>
          </View>

          <Text style={[styles.description, { color: theme.textMuted }]}>
            {t('extensionWorker.connectDescription')}
          </Text>

          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t('extensionWorker.phoneNumber')}</Text>
            <CountryCodePicker
              countryCode={countryCode}
              onCountryChange={setCountryCode}
              phone={phone}
              onPhoneChange={setPhone}
            />
            {phone.trim().length > 3 && !isValidPhone && (
              <Text style={[styles.validationError, { color: theme.error }]}>
                {t('phone.invalidNumber')}
              </Text>
            )}
          </View>

          {/* Organization selector (if EW belongs to multiple orgs) */}
          {orgs.length > 1 && (
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.textMuted }]}>
                {t('extensionWorker.organization')}
              </Text>
              <View style={styles.chipRow}>
                {orgs.map((m) => {
                  const isSelected = effectiveOrgId === m.organizationId;
                  return (
                    <TouchableOpacity
                      key={m.organizationId}
                      onPress={() => setSelectedOrgId(m.organizationId)}
                      style={[
                        styles.orgChip,
                        {
                          backgroundColor: isSelected ? theme.accent + '20' : theme.surface,
                          borderColor: isSelected ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.orgChipText, { color: isSelected ? theme.accent : theme.text }]}>
                        {m.organization?.name || m.organizationId}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Send OTP button */}
          <TouchableOpacity
            testID="connect-verify"
            style={[
              styles.primaryButton,
              { backgroundColor: isValidPhone ? theme.accent : theme.border },
            ]}
            onPress={handleSendOtp}
            disabled={!isValidPhone || isSendingOtp}
            activeOpacity={0.8}
          >
            {isSendingOtp ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <AppIcon name="shield-checkmark" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {t('extensionWorker.verifyAndConnect') || 'Verify & Connect'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip OTP — proxy connection */}
          <TouchableOpacity
            testID="connect-skip"
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={handleSkipOtp}
            disabled={!isValidPhone || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.textMuted} size="small" />
            ) : (
              <Text style={[styles.secondaryButtonText, { color: theme.textMuted }]}>
                {t('extensionWorker.connectWithoutVerification') || 'Connect without verification'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <AppIcon name="information-circle-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              {t('extensionWorker.connectInfo')}
            </Text>
          </View>
        </ScrollView>
      ) : (
        /* Consent step */
        <ScrollView style={styles.content} contentContainerStyle={styles.consentContent}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
              <AppIcon name="shield-checkmark" size={32} color={theme.accent} />
            </View>
          </View>

          <Text style={[styles.consentTitle, { color: theme.text }]}>
            {t('consent.description') || 'By approving, the extension worker will be able to:'}
          </Text>

          <View style={styles.consentPoints}>
            <ConsentPoint icon="chatbubbles-outline" text={t('consent.point1') || 'Chat with FarmerChat on your behalf'} theme={theme} />
            <ConsentPoint icon="person-outline" text={t('consent.point2') || 'View and update your farm profile'} theme={theme} />
            <ConsentPoint icon="time-outline" text={t('consent.point3') || 'Access your chat history for advisory sessions'} theme={theme} />
          </View>

          <Text style={[styles.consentPhone, { color: theme.textMuted }]}>
            {maskedPhone}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleApproveConsent}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <AppIcon name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {t('consent.approve') || 'I Approve'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={handleDeclineConsent}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.error }]}>
              {t('consent.decline') || 'Decline'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.privacyNote, { color: theme.textMuted }]}>
            {t('consent.privacyNote') || 'You can revoke access anytime from Settings.'}
          </Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

/** A single consent point with icon and text */
function ConsentPoint({ icon, text, theme }: { icon: string; text: string; theme: { text: string; surface: string; border: string } }) {
  return (
    <View style={[styles.consentPointRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppIcon name={icon} size={20} color={theme.text} />
      <Text style={[styles.consentPointText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  consentContent: { paddingBottom: SPACING['2xl'] },
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
  validationError: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  orgChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  orgChipText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
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
  // Consent step styles
  consentTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  consentPoints: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  consentPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    gap: SPACING.md,
  },
  consentPointText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
  },
  consentPhone: {
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  privacyNote: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.lg,
    lineHeight: 18,
  },
});
