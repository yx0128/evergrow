import { describe, expect, it } from 'vitest'

const modules = import.meta.glob('/src/logic/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FORBIDDEN_IMPORTS = [
  /^react(?:-dom)?(?:\/|$)/,
  /^three(?:\/|$)/,
  /^@react-three(?:\/|$)/,
  /^zustand(?:\/|$)/,
  /(?:^|\/)store(?:\/|$)/,
  /(?:^|\/)scene(?:\/|$)/,
]

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/gm, '$1')
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  for (const match of stripComments(source).matchAll(SPECIFIER)) {
    if (match[1]) specifiers.push(match[1])
  }
  return specifiers
}

function isForbidden(specifier: string): boolean {
  return FORBIDDEN_IMPORTS.some((pattern) => pattern.test(specifier))
}

/** Logic files that import the rendering, store or scene layers. */
function findForbiddenImports(files: Record<string, string>): string[] {
  const offenders: string[] = []
  for (const [path, content] of Object.entries(files)) {
    const relative = path.replace(/^\/?src\//, '')
    if (relative.endsWith('.test.ts')) continue
    if (importSpecifiers(content).some(isForbidden)) offenders.push(relative)
  }
  return offenders
}

describe('logic import guard', () => {
  it('keeps every non-test logic module free of rendering and store imports', () => {
    expect(findForbiddenImports(modules)).toEqual([])
  })

  it('flags react, react-dom, three, R3F, zustand, store and scene imports', () => {
    expect(
      findForbiddenImports({
        'react.ts': "import { useState } from 'react'",
        'react-dom.ts': "import { createPortal } from 'react-dom'",
        'three.ts': "import * as THREE from 'three'",
        'three-addons.ts': "import { OrbitControls } from 'three/addons/controls/OrbitControls.js'",
        'r3f.ts': "import { Canvas } from '@react-three/fiber'",
        'zustand.ts': "import { create } from 'zustand'",
        'store.ts': "import { useWorld } from '../store/world'",
        'export-from.ts': "export { Scene } from '../scene/World'",
      }),
    ).toEqual([
      'react.ts',
      'react-dom.ts',
      'three.ts',
      'three-addons.ts',
      'r3f.ts',
      'zustand.ts',
      'store.ts',
      'export-from.ts',
    ])
  })

  it('allows config, sibling logic and commented-out imports', () => {
    expect(
      findForbiddenImports({
        'config.ts': "import { CONFIG } from '../config/evergrow.config'",
        'sibling.ts': "import { key } from './grid'",
        'types.ts': "import type { Cell } from './cells'",
        'comment.ts': "// import { Canvas } from '@react-three/fiber'\nconst x = 1",
      }),
    ).toEqual([])
  })
})
