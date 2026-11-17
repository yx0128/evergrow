// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from './config/evergrow.config'
import App from './App'

const canvasState = vi.hoisted(() => ({ shouldThrow: false, children: null as ReactNode }))

vi.mock('@react-three/fiber', () => ({
  Canvas: (props: { style?: CSSProperties; children?: ReactNode }) => {
    canvasState.children = props.children
    if (canvasState.shouldThrow) throw new Error('WebGL unavailable')
    return <div data-testid="canvas" style={props.style} />
  },
}))

const rgb = (hex: string): string => {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

afterEach(() => {
  canvasState.shouldThrow = false
  canvasState.children = null
  cleanup()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the canvas in the day background colour', () => {
    render(<App />)
    const canvas = screen.getByTestId('canvas')
    expect(canvas.style.backgroundColor).toBe(rgb(CONFIG.palette.background.day))

    const child = canvasState.children as ReactElement<{ args: readonly string[] }>
    expect(child.type).toBe('color')
    expect(child.props.args[0]).toBe(CONFIG.palette.background.day)
  })

  it('shows the WebGL fallback when the canvas throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    canvasState.shouldThrow = true
    render(<App />)
    expect(screen.getByRole('alert').textContent).toContain(
      CONFIG.strings.webglUnavailable.title,
    )
  })
})
