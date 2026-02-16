import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import { useAppStore } from '../../store/useAppStore';
import { allLessons } from '../../data/lessons';
import { parsePinyinString } from '../../utils/pinyin';
import { SpellingItem, Lesson, ItemType } from '../../types';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface EditableItem {
  characters: string;
  pinyin: string;
  type: ItemType;
}

export default function ReviewScreen() {
  const { lessonId, items: itemsParam, detectedLessonName } = useLocalSearchParams<{
    lessonId: string;
    items: string;
    detectedLessonName?: string;
  }>();

  const customLessons = useAppStore((s) => s.customLessons);
  const addCustomLesson = useAppStore((s) => s.addCustomLesson);

  // Parse the items from params
  const initialItems: SpellingItem[] = useMemo(() => {
    try {
      return JSON.parse(itemsParam || '[]');
    } catch {
      return [];
    }
  }, [itemsParam]);

  // Editable state
  const [editItems, setEditItems] = useState<EditableItem[]>(
    initialItems.map((item) => ({
      characters: item.characters || '',
      pinyin: item.pinyin,
      type: item.type,
    }))
  );

  const nextLessonNumber = allLessons.length + customLessons.length + 1;
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [lessonName, setLessonName] = useState(
    detectedLessonName && detectedLessonName.trim()
      ? detectedLessonName
      : `听写 ${nextLessonNumber}`
  );
  const [lessonDate, setLessonDate] = useState(
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`
  );

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

  const handleSave = () => {
    // Filter out empty items
    const validItems = editItems.filter((item) => item.pinyin.trim() || item.characters.trim());

    if (validItems.length === 0) {
      Alert.alert('No words', 'Please add at least one word.');
      return;
    }

    const id = lessonId || `custom-${Date.now()}`;

    // Build SpellingItems
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

    // Build descriptive label with school and grade info
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
    };

    addCustomLesson(lesson);
    router.replace(`/lesson/${id}`);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>Review Words</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Lesson info */}
        <View style={styles.lessonInfo}>
          <Text style={styles.sectionHeader}>Lesson Details</Text>
          <View style={styles.inputRow}>
            <Text style={styles.label}>School Name</Text>
            <TextInput
              style={styles.input}
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="e.g., Lincoln Elementary"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Grade/Class</Text>
            <TextInput
              style={styles.input}
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g., Grade 2A"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Lesson Name</Text>
            <TextInput
              style={styles.input}
              value={lessonName}
              onChangeText={setLessonName}
              placeholder="听写 11"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={lessonDate}
              onChangeText={setLessonDate}
              placeholder="1月30日"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Preview of the final label */}
          {(schoolName.trim() || grade.trim()) && (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Text style={styles.previewText}>
                {lessonName}
                {(schoolName.trim() || grade.trim()) && ' - '}
                {[schoolName.trim(), grade.trim()].filter(Boolean).join(' ')}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Words ({editItems.length})
        </Text>

        {/* Word list */}
        {editItems.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemNumber}>{index + 1}</Text>
            <View style={styles.itemFields}>
              <TextInput
                style={styles.itemInput}
                value={item.characters}
                onChangeText={(v) => updateItem(index, 'characters', v)}
                placeholder="Chinese"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.itemInput}
                value={item.pinyin}
                onChangeText={(v) => updateItem(index, 'pinyin', v)}
                placeholder="pīn yīn"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Pressable
              style={[
                styles.typeToggle,
                item.type === 'hanzi' ? styles.typeHanzi : styles.typePinyin,
              ]}
              onPress={() => toggleType(index)}
            >
              <Text style={styles.typeText}>
                {item.type === 'hanzi' ? '写' : '拼'}
              </Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={() => deleteItem(index)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </Pressable>
          </View>
        ))}

        {/* Add word button */}
        <Pressable style={styles.addBtn} onPress={addItem}>
          <Text style={styles.addBtnText}>+ Add Word</Text>
        </Pressable>
      </ScrollView>

      {/* Save button */}
      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Lesson</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  lessonInfo: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
    width: 100,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xs,
    fontSize: 16,
    color: colors.text,
  },
  previewBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  previewLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  itemNumber: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  itemFields: {
    flex: 1,
    gap: spacing.xs,
  },
  itemInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  typeToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeHanzi: {
    backgroundColor: colors.tone4,
  },
  typePinyin: {
    backgroundColor: colors.tone2,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.correct,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
