import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { recognizeImage } from '../../utils/ocr';
import { colors, spacing, radius } from '../../constants/theme';

const CORNER = 28;
const CORNER_BORDER = 4;

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Existing logic (unchanged) ───────────────────────────────────────────
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
      if (!ocrText || ocrText.trim().length === 0) {
        setError('No text detected. Try a clearer image.');
        setLoading(false);
        return;
      }
      router.push({
        pathname: '/upload/questions',
        params: { lessonId, ocrText },
      });
    } catch (e: any) {
      setError(e.message || 'OCR failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan Spelling List</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === 'web' ? 0 : insets.bottom) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Viewfinder / Preview ────────────────────────────────────── */}
        <View style={styles.viewfinder}>
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setImageBase64(null);
                }}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.viewfinderPlaceholder}>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>Align list within the frame</Text>
              </View>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </>
          )}
        </View>

        {/* ── Capture Actions ──────────────────────────────────────────── */}
        <View style={styles.captureRow}>
          <Pressable style={styles.captureSecondaryBtn} onPress={pickFromGallery}>
            <View style={styles.captureSecondaryIcon}>
              <Text style={styles.captureEmoji}>🖼️</Text>
            </View>
            <Text style={styles.captureLabel}>Gallery</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.capturePrimaryBtn, pressed && { opacity: 0.85 }]}
            onPress={pickFromCamera}
          >
            <Text style={styles.capturePrimaryEmoji}>📸</Text>
          </Pressable>

          <Pressable style={styles.captureSecondaryBtn} onPress={pickPdf}>
            <View style={styles.captureSecondaryIcon}>
              <Text style={styles.captureEmoji}>📄</Text>
            </View>
            <Text style={styles.captureLabel}>File</Text>
          </Pressable>
        </View>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: (Platform.OS === 'web' ? spacing.md : insets.bottom) + spacing.sm },
        ]}
      >
        <Text style={styles.footerHint}>Verify accuracy before saving</Text>
        <Pressable
          style={[styles.scanBtn, (!imageBase64 || loading) && styles.scanBtnDisabled]}
          onPress={handleScan}
          disabled={!imageBase64 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.scanBtnText}>Save and Continue</Text>
              <Text style={styles.scanBtnArrow}>→</Text>
            </>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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

  // Viewfinder
  viewfinder: {
    width: '100%',
    height: 300,
    borderRadius: radius.xl,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
  },
  viewfinderPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
    gap: spacing.xs,
  },
  placeholderIcon: { fontSize: 56 },
  placeholderText: { color: '#FFFFFF', fontSize: 14 },
  previewImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 20,
    left: 20,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderTopLeftRadius: radius.sm,
  },
  cornerTR: {
    top: 20,
    right: 20,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderTopRightRadius: radius.sm,
  },
  cornerBL: {
    bottom: 20,
    left: 20,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderBottomLeftRadius: radius.sm,
  },
  cornerBR: {
    bottom: 20,
    right: 20,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderBottomRightRadius: radius.sm,
  },

  // Capture row
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: spacing.sm,
  },
  captureSecondaryBtn: { alignItems: 'center', gap: 4 },
  captureSecondaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureEmoji: { fontSize: 22 },
  captureLabel: { fontSize: 12, fontWeight: '500', color: '#475569' },
  capturePrimaryBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  capturePrimaryEmoji: { fontSize: 32 },

  // Error
  errorBox: {
    padding: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  footerHint: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  scanBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  scanBtnDisabled: { opacity: 0.5 },
  scanBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  scanBtnArrow: { fontSize: 18, color: '#FFFFFF' },
});
