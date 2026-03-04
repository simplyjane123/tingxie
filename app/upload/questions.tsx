import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { parseOcrWithLessons, formatMultipleLessons } from '../../utils/simpleParser';

// Level metadata for the Stitch icon grid
const LEVEL_META = [
  { level: 1, icon: '📖', label: 'Primary 1' },
  { level: 2, icon: '📚', label: 'Primary 2' },
  { level: 3, icon: '✏️', label: 'Primary 3' },
  { level: 4, icon: '🏫', label: 'Primary 4' },
  { level: 5, icon: '🧠', label: 'Primary 5' },
  { level: 6, icon: '🎓', label: 'Primary 6' },
];

export default function QuestionsScreen() {
  const insets = useSafeAreaInsets();
  const { ocrText: initialOcrText, lessonId } = useLocalSearchParams<{
    ocrText: string;
    lessonId: string;
  }>();

  // ── State (same as before) ───────────────────────────────────────────────
  const [ocrText, setOcrText] = useState(initialOcrText || '');
  const [wantPinyin, setWantPinyin] = useState<boolean>(false);
  const [wantEnglish, setWantEnglish] = useState<boolean>(false);
  const [primaryLevel, setPrimaryLevel] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Submit logic (unchanged) ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const normalizeResponse = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_ocr_text: ocrText,
          remove_pinyin: !wantPinyin,
          remove_english: !wantEnglish,
        }),
      });
      if (!normalizeResponse.ok) {
        const errorData = await normalizeResponse.json().catch(() => ({}));
        console.error('Normalization failed:', errorData);
        throw new Error(
          errorData.error || `Normalization failed: ${normalizeResponse.status}`,
        );
      }
      const normalized = await normalizeResponse.json();
      const normalizedText = normalized.sentences.join('\n');
      const lessonGroups = parseOcrWithLessons(normalizedText);
      const formattedLessons = formatMultipleLessons(
        lessonGroups,
        wantPinyin,
        wantEnglish,
        lessonId,
      );
      if (formattedLessons.length === 0 || formattedLessons[0].items.length === 0) {
        setError('No Chinese characters found in the text.');
        setLoading(false);
        return;
      }
      router.push({
        pathname: '/upload/review',
        params: {
          lessonId: formattedLessons[0].lessonId,
          items: JSON.stringify(formattedLessons[0].items),
          ocrText: normalizedText,
          detectedLessonName: normalized.lessonName || '',
          primaryLevel: String(primaryLevel),
        },
      });
    } catch (e: any) {
      console.error('Parsing error:', e);
      setError(e.message || 'Failed to process text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
      {/* ── Sticky Header with Progress Bar ──────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Spelling List</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressStepText}>Step 1 of 2</Text>
            <Text style={styles.progressPctText}>50%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '50%' }]} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (Platform.OS === 'web' ? spacing.md : insets.bottom) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Level Grid ───────────────────────────────────────────────── */}
        <View style={styles.levelSection}>
          <Text style={styles.levelHeading}>Which level is this list for?</Text>
          <Text style={styles.levelSubheading}>
            Choose a primary level to help us suggest the right words.
          </Text>
          <View style={styles.levelGrid}>
            {LEVEL_META.map(({ level, icon, label }) => {
              const selected = primaryLevel === level;
              return (
                <Pressable
                  key={level}
                  style={[styles.levelCard, selected && styles.levelCardSelected]}
                  onPress={() => setPrimaryLevel(level)}
                >
                  <View
                    style={[
                      styles.levelIconCircle,
                      selected && styles.levelIconCircleSelected,
                    ]}
                  >
                    <Text style={styles.levelIconEmoji}>{icon}</Text>
                  </View>
                  <Text style={[styles.levelLabel, selected && styles.levelLabelSelected]}>
                    {label}
                  </Text>
                  <Text style={[styles.levelTag, selected && styles.levelTagSelected]}>
                    P{level}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Info Card ────────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Primary 3–6 unlocks unguided dictation mode. Selecting a level also helps
            our AI recommend age-appropriate, curriculum-aligned words.
          </Text>
        </View>

        {/* ── Detected Text (editable) ────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detected Text</Text>
          <Text style={styles.cardHint}>You can edit or delete unwanted lines below.</Text>
          <TextInput
            style={styles.ocrInput}
            value={ocrText}
            onChangeText={setOcrText}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            placeholder="OCR text will appear here..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* ── Pinyin Toggle ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Include Hanyu Pinyin?</Text>
          <Text style={styles.cardHint}>
            Pinyin will be extracted from the image if present.
          </Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, wantPinyin && styles.toggleBtnSelected]}
              onPress={() => setWantPinyin(true)}
            >
              <Text style={[styles.toggleBtnText, wantPinyin && styles.toggleBtnTextSelected]}>
                ✓ Include pinyin
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !wantPinyin && styles.toggleBtnSelected]}
              onPress={() => setWantPinyin(false)}
            >
              <Text
                style={[styles.toggleBtnText, !wantPinyin && styles.toggleBtnTextSelected]}
              >
                ✗ No pinyin
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── English Toggle ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Include English translations?</Text>
          <Text style={styles.cardHint}>
            English meanings will be extracted if present in the image.
          </Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, wantEnglish && styles.toggleBtnSelected]}
              onPress={() => setWantEnglish(true)}
            >
              <Text
                style={[styles.toggleBtnText, wantEnglish && styles.toggleBtnTextSelected]}
              >
                ✓ Include English
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !wantEnglish && styles.toggleBtnSelected]}
              onPress={() => setWantEnglish(false)}
            >
              <Text
                style={[styles.toggleBtnText, !wantEnglish && styles.toggleBtnTextSelected]}
              >
                ✗ No English
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Footer: Back + Generate ──────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              (Platform.OS === 'web' ? spacing.md : insets.bottom) + spacing.sm,
          },
        ]}
      >
        <Pressable style={styles.backFooterBtn} onPress={() => router.back()}>
          <Text style={styles.backFooterText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.nextBtn, loading && { opacity: 0.65 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>Generate Lesson ✨</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F7F8',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 22, color: '#1E293B' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  progressSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStepText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  progressPctText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // Level grid
  levelSection: { gap: spacing.sm },
  levelHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  levelSubheading: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  levelCard: {
    width: '30%',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  levelCardSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
  },
  levelIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconCircleSelected: {
    backgroundColor: `${colors.primary}1A`,
  },
  levelIconEmoji: { fontSize: 26 },
  levelLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  levelLabelSelected: { color: '#1E293B' },
  levelTag: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  levelTagSelected: { color: colors.primary, fontWeight: '700' },

  // Info card
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: `${colors.primary}0D`,
    borderWidth: 1,
    borderColor: `${colors.primary}26`,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 20 },

  // Generic card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardHint: { fontSize: 12, color: '#64748B', lineHeight: 18 },

  // OCR input
  ocrInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 140,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },

  // Toggle buttons
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  toggleBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'center' },
  toggleBtnTextSelected: { color: colors.primary },

  // Error
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  backFooterBtn: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: '#F1F5F9',
  },
  backFooterText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  nextBtn: {
    flex: 2,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
