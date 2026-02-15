import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { speak as speakUtil } from '../../utils/speech';
import { colors } from '../../constants/theme';

interface Props {
  text: string;
  size?: 'small' | 'large' | 'tiny';
  autoPlay?: boolean;
  autoPlayDelay?: number; // Delay in ms before auto-playing
  onPress?: () => void; // Called when user taps to play audio
}

export default function SpeakButton({ text, size = 'large', autoPlay = false, autoPlayDelay = 0, onPress }: Props) {
  const [speaking, setSpeaking] = useState(false);

  React.useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        speak();
        onPress?.(); // Also trigger callback on autoPlay
      }, autoPlayDelay);
      return () => clearTimeout(timer);
    }
  }, [text]);

  const speak = () => {
    if (speaking) return;
    setSpeaking(true);
    onPress?.();
    speakUtil(text, {
      language: 'zh-CN',
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const iconSize = size === 'large' ? 48 : size === 'small' ? 36 : 24;

  return (
    <Pressable
      onPress={speak}
      style={({ pressed }) => [
        styles.button,
        { width: iconSize + 24, height: iconSize + 24, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconCircle, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
        <Text style={[styles.icon, { fontSize: iconSize * 0.5 }]}>
          {speaking ? '...' : '🔊'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
  },
});
