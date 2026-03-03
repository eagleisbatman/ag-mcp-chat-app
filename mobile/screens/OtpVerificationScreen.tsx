/**
 * OTP Verification Screen — 6-digit code entry for farmer connection consent.
 *
 * Flow: ConnectFarmerScreen → OtpVerificationScreen → success/retry
 * The farmer enters the OTP received via SMS to consent to EW connection.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SPACING, TYPOGRAPHY } from '../constants/themes';
import ScreenHeader from '../components/ui/ScreenHeader';
import IconButton from '../components/ui/IconButton';
import AppIcon from '../components/ui/AppIcon';
import { t } from '../constants/strings';
import { API_BASE_URL, API_KEY, ensureDeviceId } from '../services/api/core';
import type { RootStackParamList } from '../types';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

interface OtpVerificationScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OtpVerification'>;
  route: RouteProp<RootStackParamList, 'OtpVerification'>;
}

export default function OtpVerificationScreen({ navigation, route }: OtpVerificationScreenProps) {
  const { phone, purpose } = route.params;
  const { theme } = useApp();
  const { showSuccess, showError } = useToast();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH || isVerifying) return;
    setIsVerifying(true);
    try {
      const deviceId = await ensureDeviceId();
      const res = await fetch(`${API_BASE_URL}/api/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ phone, purpose, code }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(t('otp.verified') || 'Phone verified!');
        // Navigate back with success flag
        navigation.navigate('ConnectFarmer', { otpVerified: true, verifiedPhone: phone });
      } else {
        showError(data.error || t('otp.invalidCode') || 'Invalid code');
      }
    } catch {
      showError(t('otp.verifyFailed') || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const deviceId = await ensureDeviceId();
      const res = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ phone, purpose }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(t('otp.resent') || 'New code sent');
        setCooldown(RESEND_COOLDOWN);
        setCode('');
      } else {
        showError(data.error || t('otp.resendFailed') || 'Could not resend');
      }
    } catch {
      showError(t('otp.resendFailed') || 'Could not resend');
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when 6 digits entered.
  // Use a ref to avoid stale closure — handleVerify captures `code` from the
  // render where it was defined, but by the time useEffect fires the code state
  // is already updated. Using a ref ensures we call the latest version.
  const handleVerifyRef = useRef(handleVerify);
  handleVerifyRef.current = handleVerify;
  useEffect(() => {
    if (code.length === OTP_LENGTH) {
      handleVerifyRef.current();
    }
  }, [code]);

  const maskedPhone = phone.length > 4
    ? '***' + phone.slice(-4)
    : phone;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={t('otp.title') || 'Verify Phone'}
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

      <View style={styles.content}>
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
            <AppIcon name="shield-checkmark" size={32} color={theme.accent} />
          </View>
        </View>

        <Text style={[styles.description, { color: theme.textMuted }]}>
          {(t('otp.description') || 'Enter the 6-digit code sent to {phone}').replace('{phone}', maskedPhone)}
        </Text>

        {/* OTP input */}
        <TextInput
          ref={inputRef}
          testID="otp-input"
          style={[
            styles.codeInput,
            {
              color: theme.text,
              borderColor: code.length === OTP_LENGTH ? theme.accent : theme.border,
            },
          ]}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          placeholder="000000"
          placeholderTextColor={theme.textMuted}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
        />

        {/* Verify button */}
        <TouchableOpacity
          testID="otp-verify"
          style={[
            styles.verifyButton,
            { backgroundColor: code.length === OTP_LENGTH ? theme.accent : theme.border },
          ]}
          onPress={handleVerify}
          disabled={code.length !== OTP_LENGTH || isVerifying}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>
              {t('otp.verify') || 'Verify'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          testID="otp-resend"
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}
          style={styles.resendRow}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Text style={[styles.resendText, { color: cooldown > 0 ? theme.textMuted : theme.accent }]}>
              {cooldown > 0
                ? `${t('otp.resendIn') || 'Resend in'} ${cooldown}s`
                : t('otp.resend') || 'Resend Code'}
            </Text>
          )}
        </TouchableOpacity>
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
    marginBottom: SPACING['2xl'],
  },
  codeInput: {
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  verifyButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  resendText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
