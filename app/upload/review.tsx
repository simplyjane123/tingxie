import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { allLessons } from '../../data/lessons';
import { parsePinyinString } from '../../utils/pinyin';
import { SpellingItem, Lesson, ItemType } from '../../types';
import { colors, spacing, radius } from '../../constants/theme';

interface EditableItem {
  characters: string;
  pinyin: string;
  type: ItemType;
}

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const {
    lessonId,
    items: itemsParam,
    detectedLessonName,
    primaryLevel: primaryLevelParam,
  } = useLocalSearchParams<{
    lessonId: string;
    items: string;
    detectedLessonName?: string;
    primaryLevel?: string;
  }>();

  // ── Store (same as before) ───────────────────────────────────────────────
  const customLessons = useAppStore((s) => s.customLessons);
  const addCustomLesson = useAppStore((s) => s.addCustomLesson);

  // ── State (same as before) ───────────────────────────────────────────────
  const initialItems: SpellingItem[] = useMemo(() => {
    try {
      return JSON.parse(itemsParam || '[]');
    } catch {
      return [];
    }
  }, [itemsParam]);

  const [editItems, setEditItems] = useState<EditableItem[]>(
    initialItems.map((item) => ({
      characters: item.characters || '',
      pinyin: item.pinyin,
      type: item.type,
    })),
  );

  const nextLessonNumber = allLessons.length + customLessons.length + 1;
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [lessonName, setLessonName] = useState(
    detectedLessonName && detectedLessonName.trim()
      ? detectedLessonName
      : `听写 ${nextLessonNumber}`,
  );
  const [primaryLevel, setPrimaryLevel] = useState<number>(
    primaryLevelParam ? parseInt(primaryLevelParam, 10) : 2,
  );
  const [lessonDate, setLessonDate] = useState(
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
  );

  // ── Item operations (same as before) ────────────────────────────────────
  const updateItem = (index: number, field: keyof EditableItem, value: string) => {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditItems(updated);
  };

  const toggleType = (index: number) => {
    const updated = [...editItems];
    updated[index] = {
      ...updated[index],
      type: updated[index].type === 'pinyin' ? 'hanzi' : 'pinyin',
    };
    setEditItems(updated);
  };

  const deleteItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setEditItems([...editItems, { characters: '', pinyin: '', type: 'pinyin' }]);
  };

  // ── Save logic (same as before) ──────────────────────────────────────────
  const handleSave = () => {
    const validItems = editItems.filter(
      (item) => item.pinyin.trim() || item.characters.trim(),
    );
    if (validItems.length === 0) {
      Alert.alert('No words', 'Please add at least one word.');
      return;
    }
    const id = lessonId || `custom-${Date.now()}`;
    const spellingItems: SpellingItem[] = validItems.map((item, index) => {
      const pinyinClean = item.pinyin.trim();
      let syllables;
      try {
        syllables = pinyinClean ? parsePinyinString(pinyinClean) : [];
      } catch {
        syllables = [];
      }
      return {
        id: `${id}-${index + 1}`,
        lessonId: id,
        type: item.characters.trim() ? 'hanzi' : 'pinyin',
        pinyin: pinyinClean,
        syllables,
        characters: item.characters.trim() || undefined,
      };
    });

    let displayLabel = lessonName;
    const extras: string[] = [];
    if (schoolName.trim()) extras.push(schoolName.trim());
    if (grade.trim()) extras.push(grade.trim());
    if (extras.length > 0) {
      displayLabel = `${lessonName} - ${extras.join(' ')}`;
    }

    const lesson: Lesson = {
      id,
      label: displayLabel,
      lessonName: `第${nextLessonNumber}课`,
      order: nextLessonNumber,
      date: lessonDate,
      items: spellingItems,
      school: schoolName.trim() || undefined,
      grade: grade.trim() || undefined,
      primaryLevel,
    };

    addCustomLesson(lesson);
    router.replace(`/lesson/${id}`);
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Words Manually</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === 'web' ? spacing.md : insets.bottom) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Lesson Details Card ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lesson Details</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>School</Text>
            <TextInput
              style={styles.input}
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="e.g., Lincoln Elementary"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Grade/Class</Text>
            <TextInput
              style={styles.input}
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g., Grade 2A"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Lesson Name</Text>
            <TextInput
              style={styles.input}
              value={lessonName}
              onChangeText={setLessonName}
              placeholder="听写 11"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={lessonDate}
              onChangeText={setLessonDate}
              placeholder="1月30日"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.levelRow}>
            <Text style={styles.inputLabel}>Level</Text>
            <View style={styles.levelChips}>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <Pressable
                  key={level}
                  style={[styles.levelChip, primaryLevel === level && styles.levelChipSelected]}
                  onPress={() => setPrimaryLevel(level)}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      primaryLevel === level && styles.levelChipTextSelected,
                    ]}
                  >
                    P{level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {(schoolName.trim() || grade.trim()) && (
            <View style={styles.previewBox}>
              <Text style={styles.previewBoxLabel}>Preview</Text>
              <Text style={styles.previewBoxText}>
                {lessonName}
                {schoolName.trim() || grade.trim() ? ' — ' : ''}
                {[schoolName.trim(), grade.trim()].filter(Boolean).join(' ')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Add Word Input Form ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a Word</Text>
          <View style={styles.wordFormFields}>
            <View>
              <Text style={styles.fieldLabel}>Chinese Character</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., 你好"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Pinyin</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., nǐ hǎo"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Definition (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., Hello"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addAnotherBtn, pressed && { opacity: 0.8 }]}
            onPress={addItem}
          >
            <Text style={styles.addAnotherIcon}>＋</Text>
            <Text style={styles.addAnotherText}>Add Another Word</Text>
          </Pressable>
        </View>

        {/* ── List Preview ─────────────────────────────────────────────── */}
        {editItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>List Preview</Text>
              <Text style={styles.sectionCount}>{editItems.length} words added</Text>
            </View>
            {editItems.map((item, index) => (
              <View key={index} style={styles.wordCard}>
                <View style={styles.wordCardLeft}>
                  <View style={styles.wordCardMain}>
                    <Text style={styles.wordCharacters}>
                      {item.characters || `Word ${index + 1}`}
                    </Text>
                    {item.pinyin ? (
                      <Text style={styles.wordPinyin}>{item.pinyin}</Text>
                    ) : null}
                  </View>
                  <View style={styles.wordCardInputs}>
                    <TextInput
                      style={styles.wordCardInput}
                      value={item.characters}
                      onChangeText={(v) => updateItem(index, 'characters', v)}
                      placeholder="Chinese"
                      placeholderTextColor="#94A3B8"
                    />
                    <TextInput
                      style={styles.wordCardInput}
                      value={item.pinyin}
                      onChangeText={(v) => updateItem(index, 'pinyin', v)}
                      placeholder="pīn yīn"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={styles.wordCardActions}>
                  <Pressable
                    style={[
                      styles.typeToggle,
                      item.type === 'hanzi' ? styles.typeToggleHanzi : styles.typeTogglePinyin,
                    ]}
                    onPress={() => toggleType(index)}
                  >
                    <Text style={styles.typeToggleText}>
                      {item.type === 'hanzi' ? '写' : '拼'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => deleteItem(index)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Footer: Save List ────────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: (Platform.OS === 'web' ? spacing.md : insets.bottom) + spacing.sm },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnIcon}>💾</Text>
          <Text style={styles.saveBtnText}>Save List</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    marginLeft: spacing.sm,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // Generic card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

  // Lesson details inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    width: 90,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.lg,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  levelChip: {
    width: 40,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  levelChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  levelChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  levelChipTextSelected: { color: colors.primary },
  previewBox: {
    padding: spacing.sm,
    backgroundColor: `${colors.primary}0D`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}26`,
    gap: 4,
  },
  previewBoxLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  previewBoxText: { fontSize: 15, color: colors.primary, fontWeight: '700' },

  // Add word form
  wordFormFields: { gap: spacing.sm },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  fieldInput: {
    width: '100%',
    height: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.lg,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  addAnotherIcon: { fontSize: 18, color: colors.primary },
  addAnotherText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  // Section
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  sectionCount: { fontSize: 13, fontWeight: '500', color: '#64748B' },

  // Word card (list preview)
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: spacing.sm,
  },
  wordCardLeft: { flex: 1, gap: spacing.xs },
  wordCardMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  wordCharacters: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  wordPinyin: { fontSize: 13, fontWeight: '500', color: colors.primary, fontStyle: 'italic' },
  wordCardInputs: { gap: 4 },
  wordCardInput: {
    height: 36,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  wordCardActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleHanzi: { backgroundColor: colors.tone4 },
  typeTogglePinyin: { backgroundColor: colors.tone2 },
  typeToggleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#64748B', fontSize: 14, fontWeight: '700' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnIcon: { fontSize: 20 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
