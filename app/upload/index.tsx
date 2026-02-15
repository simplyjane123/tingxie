import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import { recognizeImage } from '../../utils/ocr';
import { parseOcrText } from '../../utils/ocrParser';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setError(null);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setError(null);
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.mimeType?.startsWith('image/')) {
          setImageUri(asset.uri);
          // For document picker, we need to read as base64 separately
          // On web, we can use fetch to get the blob
          if (Platform.OS === 'web') {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              setImageBase64(base64);
            };
            reader.readAsDataURL(blob);
          } else {
            const FileSystem = await import('expo-file-system');
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setImageBase64(base64);
          }
          setError(null);
        } else {
          setError('PDF support coming soon. Please use an image for now.');
        }
      }
    } catch (e) {
      setError('Failed to pick file');
    }
  };

  const handleScan = async () => {
    if (!imageBase64) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ocrText = await recognizeImage(imageBase64);
      const lessonId = `custom-${Date.now()}`;
      const items = parseOcrText(ocrText, lessonId);

      if (items.length === 0) {
        setError('No words detected. Try a clearer image.');
        setLoading(false);
        return;
      }

      // Navigate to review screen with parsed data
      router.push({
        pathname: '/upload/review',
        params: {
          lessonId,
          items: JSON.stringify(items),
          ocrText,
        },
      });
    } catch (e: any) {
      setError(e.message || 'OCR failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>上传听写单</Text>
        <Text style={styles.subtitle}>Upload Spelling List</Text>
      </View>

      <View style={styles.content}>
        {/* Image preview */}
        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <Pressable onPress={() => { setImageUri(null); setImageBase64(null); }} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Select an image of your spelling list</Text>
          </View>
        )}

        {/* Pick buttons */}
        <View style={styles.buttonRow}>
          <Pressable style={styles.pickBtn} onPress={pickFromGallery}>
            <Text style={styles.pickBtnText}>Gallery</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={pickFromCamera}>
            <Text style={styles.pickBtnText}>Camera</Text>
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={pickPdf}>
            <Text style={styles.pickBtnText}>File</Text>
          </Pressable>
        </View>

        {/* Error */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Scan button */}
        <Pressable
          style={[styles.scanBtn, (!imageBase64 || loading) && styles.scanBtnDisabled]}
          onPress={handleScan}
          disabled={!imageBase64 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.scanBtnText}>Scan</Text>
          )}
        </Pressable>
      </View>
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.lg,
  },
  previewContainer: {
    flex: 1,
    maxHeight: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  placeholder: {
    flex: 1,
    maxHeight: 300,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  pickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  pickBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    color: colors.incorrect,
    fontSize: 14,
    textAlign: 'center',
  },
  scanBtn: {
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  scanBtnText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
