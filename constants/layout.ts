import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const IS_TABLET = width >= 768;

export const WRITING_GRID_SIZE = IS_TABLET ? 320 : Math.min(width - 64, 300);
export const TOUCH_TARGET_MIN = 48;
