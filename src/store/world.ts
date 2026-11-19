import { create } from 'zustand'
import { CONFIG, type StarterConfig } from '../config/evergrow.config'
import type { Catalog } from '../logic/catalog'
import {
  EMPTY_HISTORY,
  execute as runCommand,
  executeBatch as runBatch,
  redo as runRedo,
  undo as runUndo,
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  type BatchResult,
  type Command,
  type History,
  type OperationResult,
  type WorldState,
} from '../logic/commands'

type PlaceCommand = Extract<Command, { readonly kind: 'place' }>

/** `place` may omit its uid; the store creates one (D031). Other commands are unchanged. */
export type WorldCommandInput =
  | Exclude<Command, { readonly kind: 'place' }>
  | (Omit<PlaceCommand, 'uid'> & { readonly uid?: string })

/** Where the latest successful world change came from; fades use it to skip undo and redo (§9). */
export type ChangeSource = 'none' | 'execute' | 'batch' | 'undo' | 'redo'

export interface WorldStoreState extends WorldState {
  readonly history: History
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly changeSource: ChangeSource
}

export interface WorldStoreActions {
  execute(command: WorldCommandInput): OperationResult
  executeBatch(commands: readonly WorldCommandInput[]): BatchResult
  undo(): OperationResult | undefined
  redo(): OperationResult | undefined
  clearHistory(): void
}

export type WorldStore = WorldStoreState & WorldStoreActions

let uidCounter = 0

function createUid(): string {
  uidCounter += 1
  const uuid = globalThis.crypto?.randomUUID
  if (typeof uuid === 'function') return uuid.call(globalThis.crypto)
  return `${CONFIG.ui.itemUidPrefix}${Date.now().toString(36)}-${uidCounter}`
}

function withUid(command: WorldCommandInput): Command {
  if (command.kind !== 'place') return command
  return { ...command, uid: command.uid ?? createUid() }
}

/** Build the starting world state; callers may override the starter for tests. */
export function starterWorld(starter: StarterConfig = CONFIG.starter): WorldState {
  const inventory = new Map<string, number>()
  for (const id of starter.items) {
    inventory.set(id, (inventory.get(id) ?? 0) + 1)
  }
  return {
    cells: new Map(),
    items: new Map(),
    occupancy: new Map(),
    inventory,
    coins: starter.coins,
  }
}

export function configCatalog(): Catalog {
  return new Map(CONFIG.items.map((item) => [item.id, item]))
}

function worldOf(state: WorldStoreState): WorldState {
  return {
    cells: state.cells,
    items: state.items,
    occupancy: state.occupancy,
    inventory: state.inventory,
    coins: state.coins,
  }
}

function historyState(history: History): Pick<WorldStoreState, 'history' | 'canUndo' | 'canRedo'> {
  return {
    history,
    canUndo: historyCanUndo(history),
    canRedo: historyCanRedo(history),
  }
}

/** Build a store bound to a catalog; tests use this to supply their own items. */
export function createWorldStore(
  catalog: Catalog = configCatalog(),
  initial: WorldState = starterWorld(),
) {
  return create<WorldStore>()((set, get) => ({
    ...initial,
    ...historyState(EMPTY_HISTORY),
    changeSource: 'none',

    execute(command) {
      const state = get()
      const result = runCommand(state.history, worldOf(state), withUid(command), catalog)
      if (result.ok) {
        set({ ...result.state, ...historyState(result.history), changeSource: 'execute' })
      }
      return result
    },

    executeBatch(commands) {
      const state = get()
      const result = runBatch(
        state.history,
        worldOf(state),
        commands.map(withUid),
        catalog,
      )
      if (result.ok) {
        set({ ...result.state, ...historyState(result.history), changeSource: 'batch' })
      }
      return result
    },

    undo() {
      const state = get()
      if (!state.canUndo) return undefined
      const result = runUndo(state.history, worldOf(state), catalog)
      if (result.ok) {
        set({ ...result.state, ...historyState(result.history), changeSource: 'undo' })
      }
      return result
    },

    redo() {
      const state = get()
      if (!state.canRedo) return undefined
      const result = runRedo(state.history, worldOf(state), catalog)
      if (result.ok) {
        set({ ...result.state, ...historyState(result.history), changeSource: 'redo' })
      }
      return result
    },

    clearHistory() {
      set(historyState(EMPTY_HISTORY))
    },
  }))
}

export const useWorldStore = createWorldStore()
