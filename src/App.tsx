import { Canvas } from '@react-three/fiber'
import { CONFIG } from './config/evergrow.config'

const background = CONFIG.palette.background.day

function App() {
  return (
    <div
      className="app"
      style={{
        backgroundColor: background,
        fontFamily: `'${CONFIG.fonts.body}', system-ui, sans-serif`,
      }}
    >
      <Canvas
        className="app-canvas"
        dpr={[1, CONFIG.rendering.pixelRatioCap]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[background]} />
      </Canvas>
    </div>
  )
}

export default App
