import { create } from 'zustand'

export type UiMode = 'view' | 'edit'

export type ActiveTool = 'paint' | 'digUp' | null

export type Selection =
  | { readonly kind: 'item'; readonly uid: string }
  | { readonly kind: 'tile'; readonly x: number; readonly z: number }

export interface DragState {
  readonly itemId: string
  readonly source: 'shop' | 'inventory'
}

export type PopoverTarget = Selection

export interface UiStore {
  readonly mode: UiMode
  readonly selection: Selection | null
  readonly dragState: DragState | null
  readonly activeTool: ActiveTool
  readonly popoverTarget: PopoverTarget | null
  setMode(mode: UiMode): void
  setSelection(selection: Selection | null): void
  setDragState(dragState: DragState | null): void
  setActiveTool(tool: ActiveTool): void
  setPopoverTarget(target: PopoverTarget | null): void
}

export const useUiStore = create<UiStore>()((set) => ({
  mode: 'view',
  selection: null,
  dragState: null,
  activeTool: null,
  popoverTarget: null,
  setMode: (mode) => set({ mode }),
  setSelection: (selection) => set({ selection }),
  setDragState: (dragState) => set({ dragState }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setPopoverTarget: (popoverTarget) => set({ popoverTarget }),
}))
