import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { allLessons } from '../../data/lessons';
import { parsePinyinString } from '../../utils/pinyin';
import { SpellingItem, Lesson, ItemType } from '../../types';
import { colors, spacing, radius } from '../../constants/theme';
import { useAuth } from '../../lib/AuthContext';
import { createSpellingList } from '../../lib/spellListsApi';

interface EditableItem {
  characters: string;
  pinyin: string;
  english: string;
  type: ItemType;
}

function StepHeader({ step, total, onBack }: { step: number; total: number; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <View style={styles.stepIndicator}>
        {Array.from({ length: total }).map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
            {i < step - 1 ? (
              <View style={styles.stepDotDone}><Text style={styles.stepDoneTick}>✓</Text></View>
            ) : (
              <View style={[styles.stepDot, i === step - 1 && styles.stepDotActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.stepLabel}>Step {step} of {total}</Text>
    </View>
  );
}

export default function ReviewScreen() {
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

  const customLessons = useAppStore((s) => s.customLessons);
  const addCustomLesson = useAppStore((s) => s.addCustomLesson);
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const initialItems: SpellingItem[] = useMemo(() => {
    try { return JSON.parse(itemsParam || '[]'); }
    catch { return []; }
  }, [itemsParam]);

  const [editItems, setEditItems] = useState<EditableItem[]>(
    initialItems.length > 0
      ? initialItems.map((item) => ({
          characters: item.characters || '',
          pinyin: item.pinyin,
          english: item.english || '',
          type: item.type,
        }))
      : [{ characters: '', pinyin: '', english: '', type: 'hanzi' }],
  );

  const nextLessonNumber = allLessons.length + customLessons.length + 1;
  const [lessonName, setLessonName] = useState(
    detectedLessonName?.trim() || `听写 ${nextLessonNumber}`,
  );
  const [primaryLevel, setPrimaryLevel] = useState<number>(
    primaryLevelParam ? parseInt(primaryLevelParam, 10) : 2,
  );
  const [lessonDate] = useState(
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
  );

  // Inline add-word form state
  const [newChar, setNewChar] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newEnglish, setNewEnglish] = useState('');

  const addWord = () => {
    if (!newChar.trim() && !newPinyin.trim()) return;
    setEditItems([
      ...editItems,
      {
        characters: newChar.trim(),
        pinyin: newPinyin.trim(),
        english: newEnglish.trim(),
        type: newChar.trim() ? 'hanzi' : 'pinyin',
      },
    ]);
    setNewChar('');
    setNewPinyin('');
    setNewEnglish('');
  };

  const deleteItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const validItems = editItems.filter((item) => item.pinyin.trim() || item.characters.trim());
    if (validItems.length === 0) {
      Alert.alert('No words', 'Please add at least one word.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to save a lesson.');
      return;
    }

    const tempId = lessonId || `custom-${Date.now()}`;
    const spellingItems: SpellingItem[] = validItems.map((item, index) => {
      const pinyinClean = item.pinyin.trim();
      let syllables: ReturnType<typeof parsePinyinString> = [];
      try { syllables = pinyinClean ? parsePinyinString(pinyinClean) : []; }
      catch { syllables = []; }
      return {
        id: `${tempId}-${index + 1}`,
        lessonId: tempId,
        type: item.characters.trim() ? 'hanzi' : ('pinyin' as const),
        pinyin: pinyinClean,
        syllables,
        characters: item.characters.trim() || undefined,
        english: item.english.trim() || undefined,
      };
    });

    const lesson: Lesson = {
      id: tempId,
      label: lessonName,
      lessonName: `第${nextLessonNumber}课`,
      order: nextLessonNumber,
      date: lessonDate,
      items: spellingItems,
      primaryLevel,
    };

    setIsSaving(true);
    try {
      const saved = await createSpellingList(lesson, user.id);
      addCustomLesson(saved);
      router.replace(`/lesson/${saved.id}`);
    } catch {
      Alert.alert('Error', 'Failed to save lesson. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StepHeader step={3} total={3} onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Add Words Manually</Text>

        {/* Lesson name + level row */}
        <View style={styles.metaRow}>
          <TextInput
            style={styles.lessonNameInput}
            value={lessonName}
            onChangeText={setLessonName}
            placeholder="List name"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.levelChips}>
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <Pressable
                key={lvl}
                style={[styles.levelChip, primaryLevel === lvl && styles.levelChipSelected]}
                onPress={() => setPrimaryLevel(lvl)}
              >
                <Text style={[styles.levelChipText, primaryLevel === lvl && styles.levelChipTextSelected]}>
                  P{lvl}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Add word form */}
        <View style={styles.addWordCard}>
          <Text style={styles.addWordTitle}>Add a Word</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Chinese</Text>
            <TextInput
              style={styles.fieldInput}
              value={newChar}
              onChangeText={setNewChar}
              placeholder="e.g. 雨衣"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Pinyin</Text>
            <TextInput
              style={styles.fieldInput}
              value={newPinyin}
              onChangeText={setNewPinyin}
              placeholder="e.g. yǔ yī"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Definition</Text>
            <TextInput
              style={styles.fieldInput}
              value={newEnglish}
              onChangeText={setNewEnglish}
              placeholder="e.g. raincoat"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Pressable
            style={[styles.addBtn, (!newChar.trim() && !newPinyin.trim()) && styles.addBtnDisabled]}
            onPress={addWord}
            disabled={!newChar.trim() && !newPinyin.trim()}
          >
            <Text style={styles.addBtnText}>+ Add to List</Text>
          </Pressable>
        </View>

        {/* List Preview */}
        {editItems.length > 0 && (
          <View style={styles.listPreview}>
            <Text style={styles.listPreviewTitle}>
              List Preview  ·  {editItems.length} word{editItems.length !== 1 ? 's' : ''}
            </Text>
            {editItems.map((item, index) => (
              <View key={index} style={styles.previewRow}>
                <View style={styles.previewRowNum}>
                  <Text style={styles.previewRowNumText}>{index + 1}</Text>
                </View>
                <View style={styles.previewRowContent}>
                  <Text style={styles.previewChar}>{item.characters || '—'}</Text>
                  <Text style={styles.previewPinyin}>{item.pinyin || '—'}</Text>
                  {item.english ? <Text style={styles.previewEnglish}>{item.english}</Text> : null}
                </View>
                <Pressable onPress={() => deleteItem(index)} style={styles.deleteBtn} hitSlop={8}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (isSaving || editItems.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving || editItems.length === 0}
        >
          {isSaving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>Save List</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Step header
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDoneTick: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: {
    backgroundColor: colors.correct,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  // Meta row (lesson name + level)
  metaRow: {
    gap: spacing.sm,
  },
  lessonNameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  levelChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  levelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  levelChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  levelChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
  },
  levelChipTextSelected: {
    color: '#FFFFFF',
  },
  // Add word card
  addWordCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  addWordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600',
    width: 76,
  },
  fieldInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addBtnDisabled: {
    backgroundColor: colors.border,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // List preview
  listPreview: {
    gap: spacing.xs,
  },
  listPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewRowNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRowNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  previewRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  previewChar: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  previewPinyin: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  previewEnglish: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  // Footer + Save
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveBtn: {
    backgroundColor: colors.correct,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.correct,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
