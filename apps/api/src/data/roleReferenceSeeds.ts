import type { RiotPlatform } from '../lib/riotRouting.js';

export interface RoleReferenceSeed {
  gameName: string;
  tagLine: string;
  platform: RiotPlatform;
  role: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
}

type RoleKey = RoleReferenceSeed['role'];

export const roleReferenceSeeds: Partial<Record<RiotPlatform, Partial<Record<RoleKey, RoleReferenceSeed[]>>>> = {
  KR: {
    TOP: [
      { gameName: 'Zeus', tagLine: 'KR1', platform: 'KR', role: 'TOP' },
      { gameName: 'Kiin', tagLine: 'KR1', platform: 'KR', role: 'TOP' },
      { gameName: 'Doran', tagLine: 'KR1', platform: 'KR', role: 'TOP' }
    ],
    JUNGLE: [
      { gameName: 'Oner', tagLine: '111', platform: 'KR', role: 'JUNGLE' },
      { gameName: 'Canyon', tagLine: 'KR1', platform: 'KR', role: 'JUNGLE' },
      { gameName: 'Peanut', tagLine: 'KR1', platform: 'KR', role: 'JUNGLE' }
    ],
    MIDDLE: [
      { gameName: 'Faker', tagLine: 'KR1', platform: 'KR', role: 'MIDDLE' },
      { gameName: 'Chovy', tagLine: 'KR1', platform: 'KR', role: 'MIDDLE' },
      { gameName: 'ShowMaker', tagLine: 'KR1', platform: 'KR', role: 'MIDDLE' }
    ],
    BOTTOM: [
      { gameName: 'Gumayusi', tagLine: 'KR1', platform: 'KR', role: 'BOTTOM' },
      { gameName: 'Viper', tagLine: 'KR1', platform: 'KR', role: 'BOTTOM' },
      { gameName: 'Ruler', tagLine: 'KR1', platform: 'KR', role: 'BOTTOM' }
    ],
    UTILITY: [
      { gameName: 'Keria', tagLine: 'KR1', platform: 'KR', role: 'UTILITY' },
      { gameName: 'Delight', tagLine: 'KR1', platform: 'KR', role: 'UTILITY' },
      { gameName: 'Lehends', tagLine: 'KR1', platform: 'KR', role: 'UTILITY' }
    ]
  },
  EUW1: {
    TOP: [
      { gameName: 'xPetu', tagLine: 'River', platform: 'EUW1', role: 'TOP' },
      { gameName: 'Bwipo', tagLine: 'EUW', platform: 'EUW1', role: 'TOP' },
      { gameName: 'Drututt', tagLine: 'EUW', platform: 'EUW1', role: 'TOP' }
    ],
    JUNGLE: [
      { gameName: 'Agurin', tagLine: 'EUW', platform: 'EUW1', role: 'JUNGLE' },
      { gameName: 'Jankos', tagLine: 'EUW', platform: 'EUW1', role: 'JUNGLE' },
      { gameName: 'Elyoya', tagLine: 'EUW', platform: 'EUW1', role: 'JUNGLE' }
    ],
    MIDDLE: [
      { gameName: 'Caps', tagLine: 'EUW', platform: 'EUW1', role: 'MIDDLE' },
      { gameName: 'Nemesis', tagLine: 'EUW', platform: 'EUW1', role: 'MIDDLE' },
      { gameName: 'LIDER', tagLine: 'EUW', platform: 'EUW1', role: 'MIDDLE' }
    ],
    BOTTOM: [
      { gameName: 'Upset', tagLine: 'EUW', platform: 'EUW1', role: 'BOTTOM' },
      { gameName: 'Hanssama', tagLine: 'EUW', platform: 'EUW1', role: 'BOTTOM' },
      { gameName: 'Crownie', tagLine: 'EUW', platform: 'EUW1', role: 'BOTTOM' }
    ],
    UTILITY: [
      { gameName: 'Mikyx', tagLine: 'EUW', platform: 'EUW1', role: 'UTILITY' },
      { gameName: 'Hylissang', tagLine: 'EUW', platform: 'EUW1', role: 'UTILITY' },
      { gameName: 'Labrov', tagLine: 'EUW', platform: 'EUW1', role: 'UTILITY' }
    ]
  },
  NA1: {
    TOP: [
      { gameName: 'Bwipo', tagLine: 'NA1', platform: 'NA1', role: 'TOP' },
      { gameName: 'Licorice', tagLine: 'NA1', platform: 'NA1', role: 'TOP' }
    ],
    JUNGLE: [
      { gameName: 'Blaber', tagLine: 'NA1', platform: 'NA1', role: 'JUNGLE' },
      { gameName: 'Inspired', tagLine: 'NA1', platform: 'NA1', role: 'JUNGLE' }
    ],
    MIDDLE: [
      { gameName: 'jojopyun', tagLine: 'NA1', platform: 'NA1', role: 'MIDDLE' },
      { gameName: 'Palafox', tagLine: 'NA1', platform: 'NA1', role: 'MIDDLE' }
    ],
    BOTTOM: [
      { gameName: 'Doublelift', tagLine: 'NA1', platform: 'NA1', role: 'BOTTOM' },
      { gameName: 'Yeon', tagLine: 'NA1', platform: 'NA1', role: 'BOTTOM' }
    ],
    UTILITY: [
      { gameName: 'CoreJJ', tagLine: 'NA1', platform: 'NA1', role: 'UTILITY' },
      { gameName: 'Busio', tagLine: 'NA1', platform: 'NA1', role: 'UTILITY' }
    ]
  }
};
