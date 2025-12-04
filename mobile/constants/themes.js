// Theme color definitions

export const THEMES = {
  light: {
    name: 'light',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#2E7D32',
    accentLight: '#E8F5E9',
    border: '#E0E0E0',
    userMessage: '#F0F0F0',
    botMessage: '#FFFFFF',
    inputBackground: '#F5F5F5',
    statusBar: 'dark',
    // Error states
    error: '#D32F2F',
    errorLight: '#FFEBEE',
    // Success states
    success: '#2E7D32',
    successLight: '#E8F5E9',
    // Warning states
    warning: '#F57C00',
    warningLight: '#FFF3E0',
  },
  dark: {
    name: 'dark',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
    text: '#E0E0E0',
    textSecondary: '#AAAAAA',
    textMuted: '#777777',
    accent: '#81C784',
    accentLight: '#1B3D1C',
    border: '#333333',
    userMessage: '#2A2A2A',
    botMessage: '#1E1E1E',
    inputBackground: '#2A2A2A',
    statusBar: 'light',
    // Error states
    error: '#EF5350',
    errorLight: '#3D1C1C',
    // Success states
    success: '#81C784',
    successLight: '#1B3D1C',
    // Warning states
    warning: '#FFB74D',
    warningLight: '#3D2E1C',
  },
};

// Standard spacing/sizing constants
export const SPACING = {
  headerPaddingOffset: 16,
  headerMinPadding: 56,
  horizontalPadding: 16,
  borderRadius: 12,
  iconButtonSize: 36,
};

export default THEMES;

