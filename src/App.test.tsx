// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Children, type CSSProperties, type ReactElement, type ReactNode } from 'react'
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

const fallbackValues: Record<string, string> = {
  '--fallback-padding': `${CONFIG.ui.fallback.paddingRem}rem`,
  '--fallback-gap': `${CONFIG.ui.fallback.gapRem}rem`,
  '--fallback-max-width': `${CONFIG.ui.fallback.maxWidthRem}rem`,
  '--fallback-title-size': `${CONFIG.ui.fallback.titleSizeRem}rem`,
  '--fallback-title-weight': String(CONFIG.ui.fallback.titleWeight),
}

const stylesheets = import.meta.glob('/src/index.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const stylesheet = stylesheets['/src/index.css'] ?? ''

const stylesheetReferences = [
  ...new Set([...stylesheet.matchAll(/var\(([^)]*)\)/g)].map((match) => match[1].trim())),
].sort()

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

    const child = Children.toArray(canvasState.children).find(
      (node) => (node as ReactElement).type === 'color',
    ) as ReactElement<{ args: readonly string[] }>
    expect(child).toBeDefined()
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

  it('sets the fallback layout variables from config', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    canvasState.shouldThrow = true
    render(<App />)
    const fallback = screen.getByRole('alert')
    expect(fallback.className).toBe('app-fallback')

    for (const [name, value] of Object.entries(fallbackValues)) {
      expect(fallback.style.getPropertyValue(name)).toBe(value)
    }

    expect(stylesheetReferences).toEqual(Object.keys(fallbackValues).sort())
  })
})
