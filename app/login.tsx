import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        shouldCreateUser: true,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>小小听写伴</Text>
        <Text style={styles.subtitle}>Chinese Spelling Practice</Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentIcon}>✉️</Text>
            <Text style={styles.sentTitle}>Check your email!</Text>
            <Text style={styles.sentText}>
              We sent a magic link to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Pressable onPress={() => setSent(false)} style={styles.resendBtn}>
              <Text style={styles.resendText}>Use a different email</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Sign in with your email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}
              onPress={handleSend}
              disabled={loading || !email.trim()}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.sendBtnText}>Send Magic Link</Text>
              }
            </Pressable>

            <Text style={styles.hint}>
              No password needed — we'll email you a sign-in link.
            </Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.incorrect,
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  sendBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  sentBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sentIcon: {
    fontSize: 48,
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  sentText: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  resendBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  resendText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
