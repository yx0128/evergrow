import { CONFIG, type InvalidReason, type ItemDef } from '../config/evergrow.config'
import { apply } from './commandApply'
import { inverseWith, invalid, valid, withWorld } from './commandHelpers'
import { validate } from './commandValidate'
import type {
  ApplyResult,
  BatchResult,
  BatchSkip,
  Command,
  History,
  HistoryEntry,
  Inverse,
  OperationResult,
  ValidateResult,
  WorldState,
} from './commandTypes'

export { apply, validate }
export type {
  ApplyResult,
  BatchResult,
  BatchSkip,
  Command,
  History,
  Inverse,
  OperationResult,
  ValidateResult,
  WorldState,
}

export const EMPTY_HISTORY: History = { past: [], future: [] }

function validateInverse(inverse: Inverse, state: WorldState): ValidateResult {
  if (state.coins + inverse.coinsDelta < 0) return invalid('unaffordable')
  for (const { id, delta } of inverse.inventoryDeltas) {
    if ((state.inventory.get(id) ?? 0) + delta < 0) return invalid('notInInventory')
  }
  return valid()
}

function appendPast(
  history: History,
  entry: HistoryEntry,
): readonly HistoryEntry[] {
  const past = [...history.past, entry]
  const limit = CONFIG.history.limit
  return past.length > limit ? past.slice(past.length - limit) : past
}

interface DeltaSum {
  coinsDelta: number
  readonly inventoryDeltas: Map<string, number>
}

function emptyDeltaSum(): DeltaSum {
  return { coinsDelta: 0, inventoryDeltas: new Map() }
}

function addInverseDeltas(sum: DeltaSum, inverse: Inverse): void {
  sum.coinsDelta += inverse.coinsDelta
  for (const { id, delta } of inverse.inventoryDeltas) {
    sum.inventoryDeltas.set(id, (sum.inventoryDeltas.get(id) ?? 0) + delta)
  }
}

function inverseWithDeltas(state: WorldState, sum: DeltaSum): Inverse {
  return inverseWith(
    state,
    sum.coinsDelta,
    [...sum.inventoryDeltas].map(([id, delta]) => ({ id, delta })),
  )
}

function validateAndApply(
  command: Command,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
):
  | { readonly ok: true; readonly applied: ApplyResult }
  | { readonly ok: false; readonly reason: InvalidReason } {
  const result = validate(command, state, catalog)
  if (!result.ok) return { ok: false, reason: result.reason }
  return { ok: true, applied: apply(command, state, catalog) }
}

function appliedResult(
  state: WorldState,
  history: History,
  entry: HistoryEntry,
  future: readonly HistoryEntry[],
): OperationResult {
  return {
    ok: true,
    state,
    history: { past: appendPast(history, entry), future },
  }
}

/** Validate, apply, record on `past`, and clear `future`; failures change nothing. */
export function execute(
  history: History,
  state: WorldState,
  command: Command,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const outcome = validateAndApply(command, state, catalog)
  if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }

  return appliedResult(
    outcome.applied.state,
    history,
    { command, inverse: outcome.applied.inverse },
    [],
  )
}

/**
 * Run drag-stroke sub-commands in order, skipping failures. One history entry
 * records only the applied commands; its inverse restores the pre-batch state.
 */
export function executeBatch(
  history: History,
  state: WorldState,
  commands: readonly Command[],
  catalog: ReadonlyMap<string, ItemDef>,
): BatchResult {
  if (commands.length === 0) throw new Error('An empty batch is not allowed')
  for (const command of commands) {
    if (command.kind === 'batch') throw new Error('Nested batches are not allowed')
  }

  const applied: Command[] = []
  const skipped: BatchSkip[] = []
  const sum = emptyDeltaSum()
  let working = state
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]
    const outcome = validateAndApply(command, working, catalog)
    if (!outcome.ok) {
      skipped.push({ index, reason: outcome.reason })
      continue
    }
    working = outcome.applied.state
    applied.push(command)
    addInverseDeltas(sum, outcome.applied.inverse)
  }

  if (applied.length === 0) {
    return {
      ok: false,
      reason: skipped[0].reason,
      state,
      history,
      skipped,
    }
  }

  const batch: Command = { kind: 'batch', commands: applied }
  return {
    ...appliedResult(
      working,
      history,
      { command: batch, inverse: inverseWithDeltas(state, sum) },
      [],
    ),
    skipped,
  }
}

/** Undo the latest command after re-validating its inverse. */
export function undo(
  history: History,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const entry = history.past[history.past.length - 1]
  if (!entry) throw new Error('Nothing to undo')

  const result = validateInverse(entry.inverse, state)
  if (!result.ok) return { ok: false, reason: result.reason, state, history }

  return {
    ok: true,
    state: withWorld(state, entry.inverse, catalog),
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, entry],
    },
  }
}

/** Redo the next command after re-validating it against the current state. */
export function redo(
  history: History,
  state: WorldState,
  catalog: ReadonlyMap<string, ItemDef>,
): OperationResult {
  const entry = history.future[history.future.length - 1]
  if (!entry) throw new Error('Nothing to redo')

  if (entry.command.kind === 'batch') {
    let working = state
    const sum = emptyDeltaSum()
    for (const command of entry.command.commands) {
      const outcome = validateAndApply(command, working, catalog)
      if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }
      working = outcome.applied.state
      addInverseDeltas(sum, outcome.applied.inverse)
    }
    return appliedResult(
      working,
      history,
      { command: entry.command, inverse: inverseWithDeltas(state, sum) },
      history.future.slice(0, -1),
    )
  }

  const outcome = validateAndApply(entry.command, state, catalog)
  if (!outcome.ok) return { ok: false, reason: outcome.reason, state, history }

  return appliedResult(
    outcome.applied.state,
    history,
    { command: entry.command, inverse: outcome.applied.inverse },
    history.future.slice(0, -1),
  )
}

export function canUndo(history: History): boolean {
  return history.past.length > 0
}

export function canRedo(history: History): boolean {
  return history.future.length > 0
}
