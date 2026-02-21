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
  '写得超好！',
  '你是天才！',
  '哇！写对了！',
  '超级无敌棒！',
  '厉害极了！',
  '你最棒！',
  '完美！',
  '写得像书法家！',
  '牛！太牛了！',
  '满分！',
  '小小书法家！',
  '赞！',
  '哇塞！好厉害！',
  '你写得真漂亮！',
  '大师级别！',
  '棒棒哒！',
];

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BD6',
  '#FFA94D', '#A66CFF', '#45CFDD', '#FF4757', '#2ED573',
  '#1E90FF', '#FF6348', '#FECA57', '#54A0FF', '#5F27CD',
];

const CONFETTI_SHAPES = ['square', 'circle', 'strip'] as const;

// Single confetti piece
function ConfettiPiece({ delay, startX, color, shape, duration }: {
  delay: number;
  startX: number;
  color: string;
  shape: typeof CONFETTI_SHAPES[number];
  duration: number;
}) {
  const translateY = useSharedValue(-30);
  const translateX = useSharedValue(startX);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in
    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));

    // Fall down
    translateY.value = withDelay(delay, withTiming(SCREEN_H + 50, {
      duration,
      easing: Easing.in(Easing.quad),
    }));

    // Drift sideways
    const drift = (Math.random() - 0.5) * 120;
    translateX.value = withDelay(delay, withTiming(startX + drift, {
      duration,
      easing: Easing.linear,
    }));

    // Spin
    const spinDir = Math.random() > 0.5 ? 1 : -1;
    rotation.value = withDelay(delay, withTiming(spinDir * (720 + Math.random() * 720), {
      duration,
      easing: Easing.linear,
    }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const pieceStyle = shape === 'circle'
    ? { width: 10, height: 10, borderRadius: 5, backgroundColor: color }
    : shape === 'strip'
    ? { width: 6, height: 16, borderRadius: 2, backgroundColor: color }
    : { width: 10, height: 10, borderRadius: 1, backgroundColor: color };

  return (
    <Animated.View style={[styles.confetti, animStyle]}>
      <View style={pieceStyle} />
    </Animated.View>
  );
}

// Rolling animal component
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
    scale.value = withDelay(delay, withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 100 }),
    ));

    const endX = direction > 0 ? SCREEN_W + 100 : -100;
    translateX.value = withDelay(delay, withTiming(endX, {
      duration: 3000,
      easing: Easing.linear,
    }));

    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(startY - 40, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(startY, { duration: 350, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    ));

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
  const subPraiseOpacity = useSharedValue(0);
  const [animals, setAnimals] = useState<Array<{
    animal: string;
    delay: number;
    startX: number;
    startY: number;
    direction: number;
    key: number;
  }>>([]);
  const [confetti, setConfetti] = useState<Array<{
    delay: number;
    startX: number;
    color: string;
    shape: typeof CONFETTI_SHAPES[number];
    duration: number;
    key: number;
  }>>([]);
  const [praise, setPraise] = useState('');
  const [subPraise, setSubPraise] = useState('');

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = 0;
      praiseScale.value = 0;
      praiseOpacity.value = 0;
      subPraiseOpacity.value = 0;
      setAnimals([]);
      setConfetti([]);
      return;
    }

    // Pick two different praises
    const shuffled = [...PRAISES].sort(() => Math.random() - 0.5);
    const selectedPraise = shuffled[0];
    const selectedSub = shuffled[1];
    setPraise(selectedPraise);
    setSubPraise(selectedSub);

    let speechDone = false;
    let timerDone = false;

    const checkAndHide = () => {
      if (speechDone && timerDone) {
        overlayOpacity.value = withTiming(0, { duration: 500 });
        praiseOpacity.value = withTiming(0, { duration: 400 });
        subPraiseOpacity.value = withTiming(0, { duration: 400 }, () => {
          if (onDone) runOnJS(onDone)();
        });
      }
    };

    speakPraise(selectedPraise, () => {
      speechDone = true;
      checkAndHide();
    });

    // Generate rolling animals — lots of them!
    const numAnimals = 10 + Math.floor(Math.random() * 6); // 10–15 animals
    const newAnimals = [];
    // Spread animals across multiple vertical bands so they fill the screen
    for (let i = 0; i < numAnimals; i++) {
      const direction = i % 2 === 0 ? 1 : -1;
      // Spread across top, middle and bottom thirds
      const band = i % 3;
      const bandTop = band === 0 ? 0.15 : band === 1 ? 0.4 : 0.65;
      newAnimals.push({
        animal: ANIMALS[i % ANIMALS.length],
        delay: i * 100,
        startX: direction > 0 ? -120 : SCREEN_W + 120,
        startY: SCREEN_H * bandTop + Math.random() * SCREEN_H * 0.18,
        direction,
        key: i,
      });
    }
    setAnimals(newAnimals);

    // Generate confetti — 3 waves
    const newConfetti = [];
    const totalPieces = 60;
    for (let i = 0; i < totalPieces; i++) {
      const wave = Math.floor(i / 20); // 3 waves of 20
      newConfetti.push({
        delay: wave * 600 + Math.random() * 400,
        startX: Math.random() * SCREEN_W,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
        duration: 2000 + Math.random() * 1500,
        key: i,
      });
    }
    setConfetti(newConfetti);

    // Full green overlay
    overlayOpacity.value = withTiming(0.85, { duration: 300 });

    // Animate praise text — big pop
    praiseOpacity.value = withTiming(1, { duration: 200 });
    praiseScale.value = withSequence(
      withTiming(1.4, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
      // Gentle pulse
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      ),
    );

    // Sub-praise fades in after main praise
    subPraiseOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));

    // Auto-hide after 3500ms AND speech is done
    const timer = setTimeout(() => {
      timerDone = true;
      checkAndHide();
    }, 3500);

    return () => clearTimeout(timer);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const praiseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: praiseScale.value }],
    opacity: praiseOpacity.value,
  }));

  const subPraiseStyle = useAnimatedStyle(() => ({
    opacity: subPraiseOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Full green overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} />

      {/* Confetti rain */}
      {confetti.map((c) => (
        <ConfettiPiece
          key={c.key}
          delay={c.delay}
          startX={c.startX}
          color={c.color}
          shape={c.shape}
          duration={c.duration}
        />
      ))}

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

      {/* Main praise text */}
      <Animated.View style={[styles.praiseContainer, praiseStyle]}>
        <Text style={styles.praiseText}>{praise}</Text>
      </Animated.View>

      {/* Sub praise text */}
      <Animated.View style={[styles.subPraiseContainer, subPraiseStyle]}>
        <Text style={styles.subPraiseText}>{subPraise}</Text>
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
  confetti: {
    position: 'absolute',
  },
  animal: {
    position: 'absolute',
  },
  animalText: {
    fontSize: 48,
  },
  praiseContainer: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  praiseText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  subPraiseContainer: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  subPraiseText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    opacity: 0.9,
  },
});
