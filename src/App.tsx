import { Canvas } from '@react-three/fiber'
import type { CSSProperties } from 'react'
import { CONFIG } from './config/evergrow.config'
import { World } from './scene/World'
import { ErrorBoundary } from './ui/ErrorBoundary'

const background = CONFIG.palette.background.day
const fallback = CONFIG.ui.fallback

const unavailable = (
  <div
    className="app-fallback"
    role="alert"
    style={{
      backgroundColor: CONFIG.palette.ui.surface,
      ...({
        '--fallback-padding': `${fallback.paddingRem}rem`,
        '--fallback-gap': `${fallback.gapRem}rem`,
        '--fallback-max-width': `${fallback.maxWidthRem}rem`,
        '--fallback-title-size': `${fallback.titleSizeRem}rem`,
        '--fallback-title-weight': fallback.titleWeight,
      } as CSSProperties),
    }}
  >
    <div className="app-fallback-inner">
      <p className="app-fallback-title" style={{ color: CONFIG.palette.ui.text }}>
        {CONFIG.appName}
      </p>
      <p style={{ color: CONFIG.palette.ui.text }}>{CONFIG.strings.webglUnavailable.title}</p>
      <p style={{ color: CONFIG.palette.ui.textMuted }}>
        {CONFIG.strings.webglUnavailable.body}
      </p>
    </div>
  </div>
)

function App() {
  return (
    <div
      className="app"
      style={{
        backgroundColor: background,
        fontFamily: CONFIG.fonts.fallback,
      }}
    >
      <ErrorBoundary fallback={unavailable}>
        <Canvas
          className="app-canvas"
          style={{ backgroundColor: background }}
          orthographic
          camera={{
            position: [...CONFIG.camera.homePosition],
            zoom: CONFIG.camera.defaultZoom,
          }}
          dpr={[1, CONFIG.rendering.pixelRatioCap]}
          gl={{ antialias: CONFIG.rendering.quality === 'high' }}
          shadows="percentage"
          fallback={unavailable}
        >
          <color attach="background" args={[background]} />
          <World />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}

export default App
