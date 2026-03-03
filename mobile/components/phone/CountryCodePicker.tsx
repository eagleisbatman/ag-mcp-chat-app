/**
 * CountryCodePicker — Reusable phone input with country code selection.
 *
 * Shows a pressable country flag+code chip that opens a bottom-sheet-style
 * modal for country search/selection. Stores selected country in AsyncStorage.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { useApp } from '../../contexts/AppContext';
import { SPACING, TYPOGRAPHY } from '../../constants/themes';
import AppIcon from '../ui/AppIcon';
import { t } from '../../constants/strings';

// ── Country data helpers ───────────────────────────────────────────

/** Regional indicator emoji flag from 2-letter ISO code */
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

interface CountryItem {
  code: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AO: 'Angola', AR: 'Argentina',
  AU: 'Australia', AT: 'Austria', BD: 'Bangladesh', BE: 'Belgium', BJ: 'Benin',
  BR: 'Brazil', BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia', CM: 'Cameroon',
  CA: 'Canada', CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CO: 'Colombia', CD: 'Congo (DRC)', CG: 'Congo (Republic)', CR: 'Costa Rica',
  CI: "Cote d'Ivoire", HR: 'Croatia', CU: 'Cuba', CZ: 'Czech Republic', DK: 'Denmark',
  DJ: 'Djibouti', DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt',
  SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea', ET: 'Ethiopia',
  FI: 'Finland', FR: 'France', GA: 'Gabon', GM: 'Gambia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau',
  HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary', IN: 'India',
  ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy',
  JM: 'Jamaica', JP: 'Japan', JO: 'Jordan', KE: 'Kenya', KR: 'South Korea',
  KW: 'Kuwait', LA: 'Laos', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libya', MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', ML: 'Mali',
  MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico', MA: 'Morocco', MZ: 'Mozambique',
  MM: 'Myanmar', NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand',
  NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
  PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru', PH: 'Philippines',
  PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RU: 'Russia',
  RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SL: 'Sierra Leone',
  SG: 'Singapore', SK: 'Slovakia', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan',
  ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SE: 'Sweden', CH: 'Switzerland',
  SY: 'Syria', TW: 'Taiwan', TZ: 'Tanzania', TH: 'Thailand', TG: 'Togo',
  TN: 'Tunisia', TR: 'Turkey', UG: 'Uganda', UA: 'Ukraine', AE: 'UAE',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
};

/** Countries featured in the app's target markets */
const POPULAR_CODES: CountryCode[] = [
  'KE', 'IN', 'ET', 'NG', 'BD', 'PH', 'ID', 'TZ', 'UG', 'GH', 'PK', 'NP', 'VN', 'TH',
];

const ALL_COUNTRIES: CountryItem[] = getCountries()
  .map((code) => {
    try {
      return {
        code,
        name: COUNTRY_NAMES[code] || code,
        dial: `+${getCountryCallingCode(code)}`,
        flag: countryFlag(code),
      };
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .sort((a, b) => a!.name.localeCompare(b!.name)) as CountryItem[];

const POPULAR_COUNTRIES = POPULAR_CODES
  .map((code) => ALL_COUNTRIES.find((c) => c.code === code))
  .filter(Boolean) as CountryItem[];

const STORAGE_KEY = 'selectedCountryCode';

// ── Props ──────────────────────────────────────────────────────────

export interface CountryCodePickerProps {
  /** The currently selected country code (ISO 3166-1 alpha-2) */
  countryCode: CountryCode;
  /** Called when user selects a new country */
  onCountryChange: (code: CountryCode) => void;
  /** The phone number (national format, no country code) */
  phone: string;
  /** Called when phone text changes */
  onPhoneChange: (text: string) => void;
  /** Placeholder for the phone input */
  placeholder?: string;
  /** Whether the input is editable */
  editable?: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export default function CountryCodePicker({
  countryCode,
  onCountryChange,
  phone,
  onPhoneChange,
  placeholder,
  editable = true,
}: CountryCodePickerProps) {
  const { theme } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const selected = useMemo(
    () => ALL_COUNTRIES.find((c) => c.code === countryCode) ?? ALL_COUNTRIES[0],
    [countryCode],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [search]);

  const handleSelect = useCallback(
    (item: CountryItem) => {
      onCountryChange(item.code);
      AsyncStorage.setItem(STORAGE_KEY, item.code);
      setModalVisible(false);
      setSearch('');
    },
    [onCountryChange],
  );

  const openModal = useCallback(() => {
    if (!editable) return;
    setModalVisible(true);
    // Focus search after modal animation
    setTimeout(() => searchRef.current?.focus(), 350);
  }, [editable]);

  // ── Render ─────────────────────────────────────────────────────

  const renderCountryRow = useCallback(
    ({ item }: { item: CountryItem }) => (
      <Pressable
        style={[styles.row, { borderBottomColor: theme.borderLight }]}
        onPress={() => handleSelect(item)}
        android_ripple={{ color: theme.accentLight }}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.rowDial, { color: theme.textSecondary }]}>{item.dial}</Text>
      </Pressable>
    ),
    [theme, handleSelect],
  );

  return (
    <>
      {/* Inline: [flag dial ▾] [phone input] */}
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          style={[styles.codeChip, { borderRightColor: theme.border }]}
          onPress={openModal}
          accessibilityRole="button"
          accessibilityLabel={t('phone.changeCountry')}
        >
          <Text style={styles.chipFlag}>{selected.flag}</Text>
          <Text style={[styles.chipDial, { color: theme.text }]}>{selected.dial}</Text>
          <AppIcon name="chevron-down" size={14} color={theme.textMuted} prefer="feather" />
        </Pressable>

        <TextInput
          testID="phone-input"
          style={[styles.phoneInput, { color: theme.text }]}
          value={phone}
          onChangeText={onPhoneChange}
          placeholder={placeholder ?? t('phone.placeholder')}
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          editable={editable}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      </View>

      {/* Country picker modal */}
      <CountryModal
        visible={modalVisible}
        search={search}
        setSearch={setSearch}
        searchRef={searchRef}
        filtered={filtered}
        onSelect={handleSelect}
        onClose={() => { setModalVisible(false); setSearch(''); }}
        renderRow={renderCountryRow}
      />
    </>
  );
}

// ── Country modal (separated for readability) ──────────────────────

interface CountryModalProps {
  visible: boolean;
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<TextInput | null>;
  filtered: CountryItem[];
  onSelect: (item: CountryItem) => void;
  onClose: () => void;
  renderRow: ({ item }: { item: CountryItem }) => React.JSX.Element;
}

function CountryModal({
  visible,
  search,
  setSearch,
  searchRef,
  filtered,
  onClose,
  renderRow,
}: CountryModalProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  const showSearch = search.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modal, { backgroundColor: theme.background, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {t('phone.selectCountry')}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <AppIcon name="x" size={22} color={theme.textSecondary} prefer="feather" />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppIcon name="search" size={16} color={theme.textMuted} prefer="feather" />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('phone.searchCountry')}
            placeholderTextColor={theme.textMuted}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <AppIcon name="x-circle" size={16} color={theme.textMuted} prefer="feather" />
            </Pressable>
          )}
        </View>

        {/* List */}
        {showSearch ? (
          <FlatList
            data={filtered}
            renderItem={renderRow}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />
        ) : (
          <FlatList
            data={[
              { type: 'header' as const, title: t('phone.popular') },
              ...POPULAR_COUNTRIES.map((c) => ({ type: 'item' as const, item: c })),
              { type: 'header' as const, title: t('phone.allCountries') },
              ...ALL_COUNTRIES.map((c) => ({ type: 'item' as const, item: c })),
            ]}
            renderItem={({ item: row }) => {
              if (row.type === 'header') {
                return (
                  <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                    {row.title}
                  </Text>
                );
              }
              return renderRow({ item: row.item });
            }}
            keyExtractor={(row, index) =>
              row.type === 'header' ? `h-${index}` : `c-${row.item.code}-${index}`
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Load persisted country code on mount ────────────────────────────

export function usePersistedCountryCode(
  initial: CountryCode = 'KE',
): [CountryCode, (code: CountryCode) => void] {
  const [code, setCode] = useState<CountryCode>(initial);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && ALL_COUNTRIES.some((c) => c.code === stored)) {
        setCode(stored as CountryCode);
      }
    });
  }, []);

  const update = useCallback((newCode: CountryCode) => {
    setCode(newCode);
    AsyncStorage.setItem(STORAGE_KEY, newCode);
  }, []);

  return [code, update];
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRightWidth: 1,
  },
  chipFlag: { fontSize: 18 },
  chipDial: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  phoneInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 22 },
  rowName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  rowDial: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
