// Theme color definitions - Pure dark/light with vibrant accents

export const THEMES = {
  light: {
    name: 'light',
    // Pure bright white base
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F2F2F7',     // iOS-style subtle gray
    surfaceElevated: '#FFFFFF',
    
    // Text hierarchy
    text: '#000000',               // Pure black for max readability
    textSecondary: '#3C3C43',      // iOS secondary label
    textMuted: '#8E8E93',          // iOS tertiary label
    
    // Green accent - darker for better light mode visibility
    accent: '#1B8A2E',             // Darker green for better contrast
    accentBright: '#22A03A',       // Slightly brighter for active states
    accentLight: '#E3F9E5',        // Very light green tint
    accentDark: '#146B24',         // Even darker for pressed states
    
    // Borders & separators (intentionally borderless UI)
    border: 'transparent',
    borderLight: 'transparent',
    
    // Message bubbles
    userMessage: '#F2F2F7',        // Subtle gray for user messages
    userMessageText: '#000000',
    botMessage: '#FFFFFF',
    botMessageText: '#000000',
    
    // Input
    inputBackground: '#F2F2F7',
    inputBorder: '#E5E5EA',
    
    // Status bar
    statusBar: 'dark',
    
    // Semantic colors
    error: '#D32F2F',              // Darker red for better visibility
    errorLight: '#FFEBE9',
    success: '#1B8A2E',            // Darker green for better visibility
    successLight: '#E3F9E5',
    warning: '#E65100',            // Darker orange for better visibility
    warningLight: '#FFF4E5',
    info: '#0056B3',               // Darker blue for better visibility
    infoLight: '#E5F1FF',

    // Icon colors (darker for light mode visibility)
    iconPrimary: '#1B8A2E',        // Darker green for better contrast
    iconSecondary: '#6B6B6B',      // Darker gray for icons
    iconAccent: '#0056B3',         // Darker blue accent
  },
  
  dark: {
    name: 'dark',
    // Pure OLED black base
    background: '#000000',         // Pure black for OLED
    surface: '#000000',            // Keep surfaces pitch black
    surfaceVariant: '#111111',     // Minimal tonal separation (Material-ish)
    surfaceElevated: '#161616',    // Slightly elevated tone (still very dark)
    
    // Text hierarchy
    text: '#FFFFFF',               // Pure white
    textSecondary: '#EBEBF5',      // iOS dark secondary (99% opacity white)
    textMuted: '#8E8E93',          // iOS dark tertiary
    
    // Vibrant green accent (extra bright for dark mode)
    accent: '#30D158',             // iOS dark mode green - very vibrant
    accentBright: '#32DE5A',       // Even brighter for icons
    accentLight: '#0D3D14',        // Dark green tint
    accentDark: '#28CD50',         // Slightly darker for pressed
    
    // Borders & separators
    border: 'transparent',
    borderLight: 'transparent',
    
    // Message bubbles
    userMessage: '#2C2C2E',        // Subtle dark gray for user messages
    userMessageText: '#FFFFFF',
    botMessage: '#1C1C1E',
    botMessageText: '#FFFFFF',
    
    // Input
    inputBackground: '#1C1C1E',
    inputBorder: '#38383A',
    
    // Status bar
    statusBar: 'light',
    
    // Semantic colors - brighter for dark mode
    error: '#FF453A',              // iOS dark red
    errorLight: '#3D1C1A',
    success: '#30D158',            // iOS dark green
    successLight: '#0D3D14',
    warning: '#FF9F0A',            // iOS dark orange
    warningLight: '#3D2E0D',
    info: '#0A84FF',               // iOS dark blue
    infoLight: '#0D2840',
    
    // Icon colors (extra bright for dark mode)
    iconPrimary: '#32DE5A',        // Extra vibrant green
    iconSecondary: '#98989D',      // Brighter gray
    iconAccent: '#0A84FF',         // Bright blue
  },
};

// Typography system
export const TYPOGRAPHY = {
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 17,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
  },
  // Line heights (multipliers)
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },
  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Standard spacing/sizing constants
export const SPACING = {
  // Base spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  
  // Component-specific
  headerPaddingOffset: 16,
  headerMinPadding: 56,
  horizontalPadding: 16,
  
  // Border radius scale
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radiusFull: 9999,
  
  // Legacy (for compatibility)
  borderRadius: 12,
  iconButtonSize: 36,
  
  // Input toolbar
  inputHeight: 48,
  inputPadding: 16,
  floatingInputMargin: 12,
};

export default THEMES;
