import { useCallback, useMemo } from 'react'
import type { ManualEdge, HistoryState, HistoryAction } from '@/types/manualEdge'

export function useHistory(initialEdges: ManualEdge[] = []) {
  const createInitialState = useCallback((): HistoryState => ({
    past: [],
    present: initialEdges,
    future: [],
  }), [initialEdges])

  const pushHistory = useCallback((state: HistoryState, action: HistoryAction): HistoryState => {
    const { past, present } = state

    let newPresent: ManualEdge[]

    switch (action.type) {
      case 'ADD':
        newPresent = [...present, action.edge]
        break
      case 'DELETE':
        newPresent = present.filter(e => e.id !== action.edge.id)
        break
      case 'UPDATE':
        newPresent = present.map(e => e.id === action.before.id ? action.after : e)
        break
    }

    return {
      past: [...past, present],
      present: newPresent,
      future: [],
    }
  }, [])

  const undo = useCallback((state: HistoryState): HistoryState => {
    if (state.past.length === 0) return state

    const previous = state.past[state.past.length - 1]
    const newPast = state.past.slice(0, -1)

    return {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    }
  }, [])

  const redo = useCallback((state: HistoryState): HistoryState => {
    if (state.future.length === 0) return state

    const next = state.future[0]
    const newFuture = state.future.slice(1)

    return {
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
    }
  }, [])

  const canUndo = useCallback((state: HistoryState): boolean => {
    return state.past.length > 0
  }, [])

  const canRedo = useCallback((state: HistoryState): boolean => {
    return state.future.length > 0
  }, [])

  const addEdge = useCallback((state: HistoryState, edge: ManualEdge): HistoryState => {
    return pushHistory(state, { type: 'ADD', edge })
  }, [pushHistory])

  const deleteEdge = useCallback((state: HistoryState, edge: ManualEdge): HistoryState => {
    return pushHistory(state, { type: 'DELETE', edge })
  }, [pushHistory])

  const updateEdge = useCallback((state: HistoryState, before: ManualEdge, after: ManualEdge): HistoryState => {
    return pushHistory(state, { type: 'UPDATE', before, after })
  }, [pushHistory])

  return useMemo(() => ({
    createInitialState,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    addEdge,
    deleteEdge,
    updateEdge,
  }), [createInitialState, pushHistory, undo, redo, canUndo, canRedo, addEdge, deleteEdge, updateEdge])
}