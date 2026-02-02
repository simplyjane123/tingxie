export const colors = {
  background: '#FFFDF7',
  surface: '#FFFFFF',
  primary: '#4A90D9',
  correct: '#4CAF50',
  incorrect: '#E53935',
  text: '#333333',
  textLight: '#888888',
  textMuted: '#BBBBBB',
  border: '#E8E4DE',
  tone1: '#4A90D9',
  tone2: '#66BB6A',
  tone3: '#FFA726',
  tone4: '#E53935',
  tone0: '#999999',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  pinyin: {
    fontSize: 48,
    fontWeight: '700' as const,
  },
  character: {
    fontSize: 64,
    fontWeight: '400' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 20,
    fontWeight: '500' as const,
  },
  button: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
};

export function toneColor(tone: number): string {
  switch (tone) {
    case 1: return colors.tone1;
    case 2: return colors.tone2;
    case 3: return colors.tone3;
    case 4: return colors.tone4;
    default: return colors.tone0;
  }
}
