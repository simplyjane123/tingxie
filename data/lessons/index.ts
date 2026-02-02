import { Lesson } from '../../types';
import { lesson1 } from './lesson1';
import { lesson2 } from './lesson2';
import { lesson3 } from './lesson3';
import { lesson4 } from './lesson4';
import { lesson5 } from './lesson5';
import { lesson6 } from './lesson6';
import { lesson7 } from './lesson7';
import { lesson8 } from './lesson8';
import { lesson9 } from './lesson9';
import { lesson10 } from './lesson10';

export const allLessons: Lesson[] = [
  lesson1, lesson2, lesson3, lesson4, lesson5,
  lesson6, lesson7, lesson8, lesson9, lesson10,
];

export function getLessonById(id: string): Lesson | undefined {
  return allLessons.find(l => l.id === id);
}

export {
  lesson1, lesson2, lesson3, lesson4, lesson5,
  lesson6, lesson7, lesson8, lesson9, lesson10,
};
