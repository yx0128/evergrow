import { Canvas } from '@react-three/fiber'
import { evergrowConfig } from './config/evergrow.config'

const background = evergrowConfig.palette.background.day

function App() {
  return (
    <div
      className="app"
      style={{
        backgroundColor: background,
        fontFamily: `'${evergrowConfig.fonts.body}', system-ui, sans-serif`,
      }}
    >
      <Canvas
        className="app-canvas"
        dpr={[1, evergrowConfig.rendering.pixelRatioCap]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[background]} />
      </Canvas>
    </div>
  )
}

export default App
