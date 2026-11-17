export type TileType = 'grass' | 'land' | 'water'
export type TaskSize = 'tiny' | 'small' | 'medium' | 'big'
export type Quality = 'high' | 'low'
export type Rotation = 0 | 1 | 2 | 3
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

export interface FontsConfig {
  /** Only used for the app name. */
  title: string
  heading: string
  body: string
}

export interface EconomyConfig {
  /** Coin reward per task size. */
  taskReward: Record<TaskSize, number>
  /** Fraction of the parent reward shared across subtasks once they are all complete. */
  subtaskShare: number
  /** Fraction of the item price refunded when selling. 1 = full refund. */
  sellRefund: number
  tileCost: number
  allowNegativeCoins: boolean
}

export interface FocusConfig {
  free: {
    coinsPerBlock: number
    blockMinutes: number
    minMinutes: number
  }
  pomodoro: {
    focusMin: number
    shortBreakMin: number
    longBreakMin: number
    cyclesBeforeLong: number
    coinsPerBlock: number
  }
}

export interface WorldConfig {
  maxSize: number
  startZone: number
  buildableRing: number
  maxStack: number
  tileThickness: number
  waterMaxStep: number
  chunkSize: number
  cameraBoundsMargin: number
}

export interface CameraConfig {
  minPolarDeg: number
  maxPolarDeg: number
  minZoom: number
  maxZoom: number
  snapRotateDeg: number
  transitionMs: number
  panSpeed: number
  rotateSpeed: number
  zoomSpeed: number
}

export interface MotionConfig {
  dropFadeMs: number
  digUpFadeMs: number
  tileAddFadeMs: number
  coinCountUpMs: number
  gridFadeMs: number
  panelMs: number
  ghostLerpMs: number
  ghostOpacity: number
}

export interface DayNightConfig {
  useLocalTime: boolean
  /** Hours in 24h local time for each keyframe. */
  keyframes: Record<TimeOfDay, number>
}

export interface RenderingConfig {
  shadowMapSize: number
  maxPointLights: number
  pixelRatioCap: number
  quality: Quality
  bloom: boolean
}

export interface VariationConfig {
  scale: number
  hue: number
}

export interface UiConfig {
  toastMs: number
  autosaveDebounceMs: number
  storagePrefix: string
}

export interface StarterConfig {
  coins: number
  items: string[]
}

export interface PaletteConfig {
  background: Record<TimeOfDay, string>
  valid: string
  invalid: string
  ui: {
    surface: string
    surfaceRaised: string
    text: string
    textMuted: string
    accent: string
    border: string
    focus: string
  }
}

export interface TileDef {
  name: string
  transparent: boolean
}

export interface ItemDef {
  id: string
  name: string
  category: string
  price: number
  footprint: [w: number, d: number]
  defaultTile: TileType
  allowedTiles: TileType[]
  connectable: boolean
  rotatable: boolean
  /** Relative public path, e.g. "assets/models/cottage.glb". */
  model: string
  /** Relative public path, e.g. "assets/thumbs/cottage.png". */
  thumb: string
  emissive: boolean
  pointLight?: { color: string; intensity: number; distance: number }
}

export type InvalidReason =
  | 'outsideBuildableZone'
  | 'outsideWorld'
  | 'occupied'
  | 'wrongTile'
  | 'unevenGround'
  | 'waterRule'
  | 'maxStack'
  | 'underItem'
  | 'unaffordable'

export interface EvergrowConfig {
  fonts: FontsConfig
  economy: EconomyConfig
  focus: FocusConfig
  world: WorldConfig
  camera: CameraConfig
  motion: MotionConfig
  dayNight: DayNightConfig
  rendering: RenderingConfig
  variation: VariationConfig
  ui: UiConfig
  starter: StarterConfig
  palette: PaletteConfig
  tiles: Record<TileType, TileDef>
  items: ItemDef[]
  strings: { invalid: Record<InvalidReason, string> }
  saveSchemaVersion: number
}

export const evergrowConfig: EvergrowConfig = {
  // TODO(decision): font families are placeholders; add the files under public/assets/fonts.
  fonts: {
    title: 'Fraunces',
    heading: 'Nunito',
    body: 'Nunito',
  },

  economy: {
    taskReward: {
      tiny: 2,
      small: 5,
      medium: 12,
      big: 30,
    },
    subtaskShare: 0.6,
    sellRefund: 1,
    tileCost: 0,
    allowNegativeCoins: false,
  },

  focus: {
    free: {
      coinsPerBlock: 5,
      blockMinutes: 5,
      minMinutes: 5,
    },
    pomodoro: {
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      cyclesBeforeLong: 4,
      coinsPerBlock: 5,
    },
  },

  world: {
    maxSize: 256,
    startZone: 10,
    buildableRing: 6,
    maxStack: 8,
    tileThickness: 1,
    waterMaxStep: 1,
    chunkSize: 16,
    cameraBoundsMargin: 4,
  },

  camera: {
    minPolarDeg: 20,
    maxPolarDeg: 80,
    minZoom: 12,
    maxZoom: 48,
    snapRotateDeg: 90,
    transitionMs: 300,
    panSpeed: 12,
    rotateSpeed: 90,
    zoomSpeed: 0.0015,
  },

  motion: {
    dropFadeMs: 120,
    digUpFadeMs: 120,
    tileAddFadeMs: 120,
    coinCountUpMs: 400,
    gridFadeMs: 150,
    panelMs: 175,
    ghostLerpMs: 60,
    ghostOpacity: 0.5,
  },

  dayNight: {
    useLocalTime: true,
    keyframes: {
      dawn: 6,
      day: 9,
      dusk: 18,
      night: 21,
    },
  },

  rendering: {
    shadowMapSize: 2048,
    maxPointLights: 8,
    pixelRatioCap: 2,
    quality: 'high',
    bloom: false,
  },

  variation: {
    scale: 0.04,
    hue: 0.02,
  },

  ui: {
    toastMs: 3000,
    autosaveDebounceMs: 500,
    storagePrefix: 'evergrow:',
  },

  starter: {
    coins: 0,
    // TODO(decision): starter item undecided; start with an empty inventory.
    items: [],
  },

  palette: {
    background: {
      dawn: '#f3e7d8',
      day: '#d7e0e9',
      dusk: '#e7cdb9',
      night: '#2c3242',
    },
    valid: '#7da37a',
    invalid: '#b96a5f',
    ui: {
      surface: '#fbf7f0',
      surfaceRaised: '#ffffff',
      text: '#3b352e',
      textMuted: '#7a7166',
      accent: '#7c8f6b',
      border: '#ddd4c6',
      focus: '#4f6b45',
    },
  },

  tiles: {
    grass: { name: 'Grass', transparent: false },
    land: { name: 'Land', transparent: false },
    water: { name: 'Water', transparent: true },
  },

  // TODO(decision): item catalog pending; add items once the list is chosen.
  items: [],

  strings: {
    invalid: {
      outsideBuildableZone: 'Outside the buildable area',
      outsideWorld: 'Outside the world',
      occupied: 'Something is already here',
      wrongTile: "This item can't go on that tile",
      unevenGround: 'Uneven ground',
      waterRule: 'Water levels would not match',
      maxStack: 'Maximum height reached',
      underItem: 'Store or move the item first',
      unaffordable: 'Not enough coins',
    },
  },

  saveSchemaVersion: 1,
}

export default evergrowConfig
