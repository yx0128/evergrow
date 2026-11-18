// Must stay free of browser, React and three imports: vite.config imports this file.
export type TileType = 'grass' | 'land' | 'water'
export type TaskSize = 'tiny' | 'small' | 'medium' | 'big'
export type Quality = 'high' | 'low'
export type Rotation = 0 | 1 | 2 | 3
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

export interface FontsConfig {
  /** Only used for the app name. */
  readonly title: string
  readonly heading: string
  readonly body: string
  readonly fallback: string
}

export interface EconomyConfig {
  /** Coin reward per task size. */
  readonly taskReward: Readonly<Record<TaskSize, number>>
  /** Fraction of the parent reward shared across subtasks; each subtask is paid when completed. */
  readonly subtaskShare: number
  readonly tileCost: number
  readonly allowNegativeCoins: boolean
}

export interface FocusConfig {
  readonly free: {
    readonly coinsPerBlock: number
    readonly blockMinutes: number
    readonly minMinutes: number
  }
  readonly pomodoro: {
    readonly focusMin: number
    readonly shortBreakMin: number
    readonly longBreakMin: number
    readonly cyclesBeforeLong: number
    readonly coinsPerBlock: number
  }
}

export interface WorldConfig {
  readonly maxSize: number
  readonly startZone: number
  readonly buildableRing: number
  readonly maxStack: number
  readonly tileThickness: number
  readonly chunkSize: number
  readonly cameraBoundsMargin: number
}

export interface CameraConfig {
  readonly minPolarDeg: number
  readonly maxPolarDeg: number
  readonly minZoom: number
  readonly maxZoom: number
  readonly homePosition: readonly [number, number, number]
  readonly defaultZoom: number
  readonly snapRotateDeg: number
  readonly transitionMs: number
  readonly panSpeed: number
  readonly rotateSpeed: number
  readonly zoomSpeed: number
}

export interface HistoryConfig {
  readonly limit: number
}

export interface MotionConfig {
  readonly dropFadeMs: number
  readonly digUpFadeMs: number
  readonly tileAddFadeMs: number
  readonly coinCountUpMs: number
  readonly gridFadeMs: number
  readonly panelMs: number
  readonly ghostLerpMs: number
  readonly ghostOpacity: number
}

export interface DayNightConfig {
  readonly useLocalTime: boolean
  /** Hours in 24h local time for each keyframe. */
  readonly keyframes: Readonly<Record<TimeOfDay, number>>
}

export interface RenderingConfig {
  readonly shadowMapSize: number
  readonly maxPointLights: number
  readonly pixelRatioCap: number
  readonly quality: Quality
  readonly bloom: boolean
}

export interface VariationConfig {
  readonly scale: number
  readonly hue: number
}

export interface UiConfig {
  readonly toastMs: number
  readonly autosaveDebounceMs: number
  readonly storagePrefix: string
}

export interface StarterConfig {
  readonly coins: number
  readonly items: readonly string[]
}

export interface PaletteConfig {
  readonly background: Readonly<Record<TimeOfDay, string>>
  readonly valid: string
  readonly invalid: string
  readonly ui: {
    readonly surface: string
    readonly surfaceRaised: string
    readonly text: string
    readonly textMuted: string
    readonly accent: string
    readonly border: string
    readonly focus: string
  }
}

export interface TileDef {
  readonly name: string
  readonly transparent: boolean
}

export interface PointLightDef {
  readonly color: string
  readonly intensity: number
  readonly distance: number
}

export interface ItemDef {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly price: number
  readonly footprint: readonly [w: number, d: number]
  readonly defaultTile: TileType
  readonly allowedTiles: readonly TileType[]
  readonly connectable: boolean
  /** Relative public path, e.g. "assets/models/cottage.glb". */
  readonly model: string
  /** Relative public path, e.g. "assets/thumbs/cottage.png". */
  readonly thumb: string
  readonly emissive: boolean
  readonly pointLight?: PointLightDef
}

export type InvalidReason =
  | 'outsideBuildableZone'
  | 'outsideWorld'
  | 'occupied'
  | 'wrongTile'
  | 'unevenGround'
  | 'maxStack'
  | 'minStack'
  | 'underItem'
  | 'unaffordable'
  | 'notInInventory'

export interface StringsConfig {
  readonly invalid: Readonly<Record<InvalidReason, string>>
  readonly webglUnavailable: {
    readonly title: string
    readonly body: string
  }
}

export interface EvergrowConfig {
  readonly appName: string
  readonly fonts: FontsConfig
  readonly economy: EconomyConfig
  readonly focus: FocusConfig
  readonly world: WorldConfig
  readonly camera: CameraConfig
  readonly motion: MotionConfig
  readonly history: HistoryConfig
  readonly dayNight: DayNightConfig
  readonly rendering: RenderingConfig
  readonly variation: VariationConfig
  readonly ui: UiConfig
  readonly starter: StarterConfig
  readonly palette: PaletteConfig
  readonly tiles: Readonly<Record<TileType, TileDef>>
  readonly items: readonly ItemDef[]
  readonly strings: StringsConfig
  readonly saveSchemaVersion: number
}

export const CONFIG: EvergrowConfig = {
  appName: 'Evergrow',

  // TODO(decision): font families are placeholders; add the files under public/assets/fonts.
  fonts: {
    title: 'Fraunces',
    heading: 'Nunito',
    body: 'Nunito',
    fallback: 'system-ui, sans-serif',
  },

  economy: {
    taskReward: {
      tiny: 2,
      small: 5,
      medium: 12,
      big: 30,
    },
    subtaskShare: 0.6,
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
    chunkSize: 16,
    cameraBoundsMargin: 4,
  },

  camera: {
    minPolarDeg: 20,
    maxPolarDeg: 80,
    minZoom: 12,
    maxZoom: 48,
    homePosition: [10, 10, 10],
    defaultZoom: 24,
    snapRotateDeg: 90,
    transitionMs: 300,
    panSpeed: 12,
    rotateSpeed: 90,
    zoomSpeed: 0.0015,
  },

  history: {
    limit: 50,
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
    webglUnavailable: {
      title: '3D view unavailable',
      body: 'This browser could not start WebGL. Try enabling hardware acceleration or using another desktop browser.',
    },
    invalid: {
      outsideBuildableZone: 'Outside the buildable area',
      outsideWorld: 'Outside the world',
      occupied: 'Something is already here',
      wrongTile: "This item can't go on that tile",
      unevenGround: 'Uneven ground',
      maxStack: 'Maximum height reached',
      minStack: 'Minimum height reached',
      underItem: 'Store or move the item first',
      unaffordable: 'Not enough coins',
      notInInventory: 'Not in your inventory',
    },
  },

  saveSchemaVersion: 1,
}
