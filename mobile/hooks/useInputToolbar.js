/**
 * InputToolbar state management hook
 * Handles text input, voice recording mode, and media selection state
 */
import { useState, useRef, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useToast } from '../contexts/ToastContext';
import { t } from '../constants/strings';

export default function useInputToolbar({
  onSendText,
  onSendImage,
  uploadAudioInBackground,
  disabled = false,
}) {
  const { showError, showWarning } = useToast();
  
  // State
  const [text, setText] = useState('');
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  
  // Refs
  const textInputRef = useRef(null);

  /**
   * Handle sending text message
   */
  const handleSendText = useCallback(() => {
    if (!text.trim() || disabled) return;

    const messageText = text.trim();

    // Upload audio in background if this message came from voice
    if (isFromVoice && pendingAudioData && uploadAudioInBackground) {
      uploadAudioInBackground(pendingAudioData).catch(() => {
        // Silent fail for background upload
      });
    }

    onSendText(messageText);
    setText('');
    setPendingAudioData(null);
    setIsFromVoice(false);
  }, [text, disabled, isFromVoice, pendingAudioData, uploadAudioInBackground, onSendText]);

  /**
   * Handle image picking from library
   */
  const handlePickImage = useCallback(async () => {
    if (disabled) return;
    setShowMediaMenu(false);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('media.photoLibraryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64,
          text: text.trim(),
        });
        setText('');
      }
    } catch (error) {
      showError(t('media.pickImageFailed'));
    }
  }, [disabled, text, onSendImage, showWarning, showError]);

  /**
   * Handle camera capture
   */
  const handleTakePhoto = useCallback(async () => {
    if (disabled) return;
    setShowMediaMenu(false);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('media.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        onSendImage({
          uri: asset.uri,
          base64: asset.base64,
          text: text.trim(),
        });
        setText('');
      }
    } catch (error) {
      showError(t('media.takePhotoFailed'));
    }
  }, [disabled, text, onSendImage, showWarning, showError]);

  /**
   * Handle voice transcription complete
   */
  const handleTranscriptionComplete = useCallback((transcription, audioData) => {
    setText(transcription);
    setIsRecordingMode(false);
    setIsFromVoice(true);
    setPendingAudioData(audioData);
    
    // Focus the text input so user can edit before sending
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, []);

  /**
   * Cancel voice recording
   */
  const handleCancelRecording = useCallback(() => {
    setIsRecordingMode(false);
  }, []);

  /**
   * Start voice recording mode
   */
  const startRecordingMode = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecordingMode(true);
  }, [disabled]);

  /**
   * Open media attachment menu
   */
  const openMediaMenu = useCallback(() => {
    setShowMediaMenu(true);
  }, []);

  /**
   * Close media attachment menu
   */
  const closeMediaMenu = useCallback(() => {
    setShowMediaMenu(false);
  }, []);

  return {
    // State
    text,
    setText,
    isRecordingMode,
    showMediaMenu,
    isFromVoice,
    
    // Refs
    textInputRef,
    
    // Handlers
    handleSendText,
    handlePickImage,
    handleTakePhoto,
    handleTranscriptionComplete,
    handleCancelRecording,
    startRecordingMode,
    openMediaMenu,
    closeMediaMenu,
  };
}
