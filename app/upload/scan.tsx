import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { recognizeImage } from '../../utils/ocr';
import { colors, spacing, radius } from '../../constants/theme';

export default function ScanScreen() {
  const { primaryLevel } = useLocalSearchParams<{ primaryLevel?: string }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

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
      setOcrResult(null);
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
      setOcrResult(null);
    }
  };

  const pickFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.mimeType?.startsWith('image/')) {
          setImageUri(asset.uri);
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
            const base64 = await FileSystem.default.readAsStringAsync(asset.uri, {
              encoding: 'base64' as any,
            });
            setImageBase64(base64);
          }
          setError(null);
          setOcrResult(null);
        } else {
          setError('PDF support coming soon. Please use an image.');
        }
      }
    } catch {
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
      if (!ocrText || ocrText.trim().length === 0) {
        setError('No text detected. Try a clearer image.');
        setLoading(false);
        return;
      }
      setOcrResult(ocrText);
    } catch (e: any) {
      setError(e.message || 'OCR failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!ocrResult) return;
    const lessonId = `custom-${Date.now()}`;
    router.push({
      pathname: '/upload/questions',
      params: {
        lessonId,
        ocrText: ocrResult,
        primaryLevel: primaryLevel || '2',
      },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Scan Spelling List</Text>
      </View>

      {/* Viewfinder / Preview */}
      <View style={styles.viewfinderContainer}>
        {imageUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <Pressable
              onPress={() => { setImageUri(null); setImageBase64(null); setOcrResult(null); }}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.viewfinder}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.viewfinderText}>Position your spelling list here</Text>
          </View>
        )}
      </View>

      {/* Camera Controls */}
      <View style={styles.controls}>
        <Pressable style={styles.controlBtn} onPress={pickFromGallery}>
          <Text style={styles.controlBtnIcon}>🖼</Text>
          <Text style={styles.controlBtnLabel}>Gallery</Text>
        </Pressable>

        <Pressable
          style={[styles.captureBtn, (!imageBase64 || loading) && styles.captureBtnDisabled]}
          onPress={imageBase64 ? handleScan : pickFromCamera}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" size="large" />
            : <Text style={styles.captureBtnText}>{imageBase64 ? 'Scan' : '📷'}</Text>
          }
        </Pressable>

        <Pressable style={styles.controlBtn} onPress={pickFromFile}>
          <Text style={styles.controlBtnIcon}>📁</Text>
          <Text style={styles.controlBtnLabel}>File</Text>
        </Pressable>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Scanning Results */}
      {ocrResult && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsSectionTitle}>Scanning Results</Text>
          <View style={styles.resultsBox}>
            <Text style={styles.resultsText} numberOfLines={6}>{ocrResult}</Text>
          </View>
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Save and Continue →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backBtn: {},
  backText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Viewfinder
  viewfinderContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0D0D1A',
  },
  previewWrapper: {
    flex: 1,
    position: 'relative',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  cornerTL: {
    top: 24,
    left: 24,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 24,
    right: 24,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 24,
    left: 24,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 24,
    right: 24,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  viewfinderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  // Controls row
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    backgroundColor: '#1A1A2E',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  controlBtnIcon: {
    fontSize: 26,
  },
  controlBtnLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  captureBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  captureBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Error
  errorBox: {
    marginHorizontal: spacing.md,
    backgroundColor: '#FFEBEE',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
  },
  // Scanning Results
  resultsSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  resultsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  continueBtn: {
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
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
