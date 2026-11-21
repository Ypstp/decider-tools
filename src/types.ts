export type GameToolId =
  | 'wheel'
  | 'roulette'
  | 'bottle'
  | 'cards'
  | 'dice'
  | 'coin'
  | 'shell'
  | 'number'
  | 'choice'
  | 'password'
  | 'color';

export type ToolId = 'dashboard' | 'history' | GameToolId;

export type LanguageCode = 'en' | 'ru' | 'es' | 'de' | 'fr';

export type ThemeMode = 'dark' | 'light';

export type AccentColor = 'cobalt' | 'emerald' | 'amber' | 'rose';

export type SoundTheme = 'classic' | 'minimal' | 'arcade' | 'nature';

export interface HistoryEntry {
  id: string;
  text: string;
  detail?: string;
  time: string;
  createdAt?: number;
}

export type HistoryMap = Partial<Record<GameToolId, HistoryEntry[]>>;

export interface SavedPreset {
  id: string;
  tool: 'wheel' | 'roulette' | 'choice' | 'bottle' | 'cards';
  name: string;
  items: string;
}

export interface AppSettings {
  theme: ThemeMode;
  lang: LanguageCode;
  sound: boolean;
  volume: number;
  soundTheme: SoundTheme;
  accent: AccentColor;
  shortcut: string;
}
