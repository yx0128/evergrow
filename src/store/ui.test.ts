import { afterEach, describe, expect, it } from 'vitest'
import { useUiStore } from './ui'

const reset = () =>
  useUiStore.setState({
    mode: 'view',
    selection: null,
    dragState: null,
    activeTool: null,
    popoverTarget: null,
  })

afterEach(reset)

describe('ui store', () => {
  it('starts in view mode with nothing selected or dragged', () => {
    reset()
    const state = useUiStore.getState()
    expect(state.mode).toBe('view')
    expect(state.selection).toBeNull()
    expect(state.dragState).toBeNull()
    expect(state.activeTool).toBeNull()
    expect(state.popoverTarget).toBeNull()
  })

  it('sets mode, selection, tool, drag state and popover target', () => {
    const store = useUiStore.getState()
    store.setMode('edit')
    store.setSelection({ kind: 'tile', x: 1, z: 2 })
    store.setActiveTool('paint')
    store.setDragState({ itemId: 'lamp', source: 'inventory' })
    store.setPopoverTarget({ kind: 'item', uid: 'a' })

    const state = useUiStore.getState()
    expect(state.mode).toBe('edit')
    expect(state.selection).toEqual({ kind: 'tile', x: 1, z: 2 })
    expect(state.activeTool).toBe('paint')
    expect(state.dragState).toEqual({ itemId: 'lamp', source: 'inventory' })
    expect(state.popoverTarget).toEqual({ kind: 'item', uid: 'a' })

    const latest = useUiStore.getState()
    latest.setMode('view')
    latest.setSelection(null)
    latest.setActiveTool(null)
    latest.setDragState(null)
    latest.setPopoverTarget(null)
    expect(useUiStore.getState().mode).toBe('view')
    expect(useUiStore.getState().selection).toBeNull()
    expect(useUiStore.getState().activeTool).toBeNull()
    expect(useUiStore.getState().dragState).toBeNull()
    expect(useUiStore.getState().popoverTarget).toBeNull()
  })
})
