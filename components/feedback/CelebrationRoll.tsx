import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { speakPraise } from '../../utils/speech';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDone?: () => void;
}

const ANIMALS = ['🐼', '🐰', '🐱', '🐶', '🦊', '🐻', '🐨', '🦁', '🐯', '🐸'];
const PRAISES = [
  '太棒了！',
  '真厉害！',
  '好聪明！',
  '做得好！',
  '真了不起！',
  '你真棒！',
  '太厉害了！',
  '非常好！',
  '继续加油！',
  '很棒哦！',
];

// Single rolling animal component
function RollingAnimal({ animal, delay, startX, startY, direction }: {
  animal: string;
  delay: number;
  startX: number;
  startY: number;
  direction: number;
}) {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Pop in
    scale.value = withDelay(delay, withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 100 }),
    ));

    // Roll across screen (3 seconds)
    const endX = direction > 0 ? SCREEN_W + 100 : -100;
    translateX.value = withDelay(delay, withTiming(endX, {
      duration: 3000,
      easing: Easing.linear,
    }));

    // Bounce up and down while rolling
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(startY - 40, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(startY, { duration: 350, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    ));

    // Spin while rolling
    rotation.value = withDelay(delay, withTiming(direction * 1080, {
      duration: 3000,
      easing: Easing.linear,
    }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.animal, animStyle]}>
      <Text style={styles.animalText}>{animal}</Text>
    </Animated.View>
  );
}

export default function CelebrationRoll({ visible, onDone }: Props) {
  const overlayOpacity = useSharedValue(0);
  const praiseScale = useSharedValue(0);
  const praiseOpacity = useSharedValue(0);
  const [animals, setAnimals] = useState<Array<{
    animal: string;
    delay: number;
    startX: number;
    startY: number;
    direction: number;
    key: number;
  }>>([]);
  const [praise, setPraise] = useState('');

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = 0;
      praiseScale.value = 0;
      praiseOpacity.value = 0;
      setAnimals([]);
      return;
    }

    // Pick random praise and speak it
    const selectedPraise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
    setPraise(selectedPraise);

    let speechDone = false;
    let timerDone = false;

    const checkAndHide = () => {
      if (speechDone && timerDone) {
        overlayOpacity.value = withTiming(0, { duration: 400 });
        praiseOpacity.value = withTiming(0, { duration: 400 }, () => {
          if (onDone) runOnJS(onDone)();
        });
      }
    };

    speakPraise(selectedPraise, () => {
      speechDone = true;
      checkAndHide();
    });

    // Generate 4-6 random animals
    const numAnimals = 4 + Math.floor(Math.random() * 3);
    const newAnimals = [];
    for (let i = 0; i < numAnimals; i++) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      newAnimals.push({
        animal: ANIMALS[Math.floor(Math.random() * ANIMALS.length)],
        delay: i * 150,
        startX: direction > 0 ? -100 : SCREEN_W + 100,
        startY: SCREEN_H * 0.3 + Math.random() * SCREEN_H * 0.4,
        direction,
        key: i,
      });
    }
    setAnimals(newAnimals);

    // Fade in green overlay
    overlayOpacity.value = withTiming(0.3, { duration: 200 });

    // Animate praise text
    praiseOpacity.value = withTiming(1, { duration: 200 });
    praiseScale.value = withSequence(
      withTiming(1.3, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
    );

    // Auto-hide after 3000ms (3 seconds) AND speech is done
    const timer = setTimeout(() => {
      timerDone = true;
      checkAndHide();
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const praiseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: praiseScale.value }],
    opacity: praiseOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Green overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} />

      {/* Rolling animals */}
      {animals.map((a) => (
        <RollingAnimal
          key={a.key}
          animal={a.animal}
          delay={a.delay}
          startX={a.startX}
          startY={a.startY}
          direction={a.direction}
        />
      ))}

      {/* Praise text */}
      <Animated.View style={[styles.praiseContainer, praiseStyle]}>
        <Text style={styles.praiseText}>{praise}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4CAF50',
  },
  animal: {
    position: 'absolute',
  },
  animalText: {
    fontSize: 48,
  },
  praiseContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  praiseText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
