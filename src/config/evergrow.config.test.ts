import { describe, expect, expectTypeOf, it } from 'vitest'
import { CONFIG as config } from './evergrow.config'
import type { ItemDef, Quality, TileType } from './evergrow.config'

const TILE_TYPES: TileType[] = ['grass', 'land', 'water']

describe('evergrow config', () => {
  it('has the brief-fixed world bounds', () => {
    expect(config.appName.length).toBeGreaterThan(0)
    expect(config.world.maxSize).toBe(256)
    expect(config.world.startZone).toBe(10)
    expect(config.world.buildableRing).toBe(6)
    expect(config.world.maxStack).toBe(8)
    expect(config.world.tileThickness).toBeGreaterThan(0)
    expect(config.world.chunkSize).toBeGreaterThan(0)
  })

  it('has a non-negative, increasing task economy', () => {
    const { taskReward, subtaskShare, tileCost, allowNegativeCoins } = config.economy
    const rewards = Object.values(taskReward)
    expect(rewards.every((reward) => reward >= 0)).toBe(true)
    expect(taskReward.tiny).toBeLessThan(taskReward.small)
    expect(taskReward.small).toBeLessThan(taskReward.medium)
    expect(taskReward.medium).toBeLessThan(taskReward.big)
    expect(subtaskShare).toBeGreaterThan(0)
    expect(subtaskShare).toBeLessThanOrEqual(1)
    expect(tileCost).toBe(0)
    expect(allowNegativeCoins).toBe(false)
  })

  it('has valid focus session defaults', () => {
    const { free, pomodoro } = config.focus
    expect(free.blockMinutes).toBeGreaterThan(0)
    expect(free.minMinutes).toBeGreaterThan(0)
    expect(free.minMinutes).toBeGreaterThanOrEqual(free.blockMinutes)
    expect(free.coinsPerBlock).toBeGreaterThanOrEqual(0)
    expect(pomodoro.focusMin).toBeGreaterThan(0)
    expect(pomodoro.shortBreakMin).toBeGreaterThan(0)
    expect(pomodoro.longBreakMin).toBeGreaterThanOrEqual(pomodoro.shortBreakMin)
    expect(pomodoro.cyclesBeforeLong).toBeGreaterThanOrEqual(1)
    expect(pomodoro.coinsPerBlock).toBeGreaterThanOrEqual(0)
  })

  it('keeps the brief camera limits', () => {
    const { camera } = config
    expect(camera.minPolarDeg).toBe(20)
    expect(camera.maxPolarDeg).toBe(80)
    expect(camera.minPolarDeg).toBeLessThan(camera.maxPolarDeg)
    expect(camera.maxPolarDeg).toBeLessThan(90)
    expect(camera.minZoom).toBeGreaterThan(0)
    expect(camera.minZoom).toBeLessThan(camera.maxZoom)
    expect(camera.defaultZoom).toBeGreaterThan(camera.minZoom)
    expect(camera.defaultZoom).toBeLessThan(camera.maxZoom)
    const [x, y, z] = camera.homePosition
    const polar = (Math.acos(y / Math.hypot(x, y, z)) * 180) / Math.PI
    expect(polar).toBeGreaterThanOrEqual(camera.minPolarDeg)
    expect(polar).toBeLessThanOrEqual(camera.maxPolarDeg)
    expect(camera.transitionMs).toBeGreaterThan(0)
    expect(camera.snapRotateDeg).toBe(90)
  })

  it('has sane motion timings', () => {
    const { motion } = config
    expect(motion.dropFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.digUpFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.tileAddFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.coinCountUpMs).toBeGreaterThanOrEqual(350)
    expect(motion.coinCountUpMs).toBeLessThanOrEqual(450)
    expect(motion.gridFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.panelMs).toBeGreaterThanOrEqual(150)
    expect(motion.panelMs).toBeLessThanOrEqual(200)
    expect(motion.ghostLerpMs).toBeGreaterThanOrEqual(0)
    expect(motion.ghostLerpMs).toBeLessThanOrEqual(60)
    expect(motion.ghostOpacity).toBeGreaterThan(0)
    expect(motion.ghostOpacity).toBeLessThan(1)
  })

  it('has ordered day/night keyframes', () => {
    const { dawn, day, dusk, night } = config.dayNight.keyframes
    expect(dawn).toBeGreaterThanOrEqual(0)
    expect(dawn).toBeLessThan(day)
    expect(day).toBeLessThan(dusk)
    expect(dusk).toBeLessThan(night)
    expect(night).toBeLessThan(24)
  })

  it('has sane rendering settings', () => {
    const { rendering } = config
    expect(rendering.shadowMapSize).toBeGreaterThan(0)
    expect(rendering.maxPointLights).toBe(8)
    expect(rendering.pixelRatioCap).toBeGreaterThan(0)
    expect(['high', 'low']).toContain(rendering.quality)
    expect(typeof rendering.bloom).toBe('boolean')
  })

  it('defines every tile type', () => {
    for (const tile of TILE_TYPES) {
      expect(config.tiles[tile]).toBeDefined()
      expect(config.tiles[tile].name.length).toBeGreaterThan(0)
    }
    expect(config.tiles.water.transparent).toBe(true)
    expect(config.tiles.grass.transparent).toBe(false)
    expect(config.tiles.land.transparent).toBe(false)
  })

  it('starts with zero coins', () => {
    // The catalog is intentionally empty pending D003; validate it once items land.
    expect(config.starter.coins).toBe(0)
  })

  it('has valid Hex colours', () => {
    const hex = /^#[0-9a-f]{6}$/i
    for (const colour of Object.values(config.palette.background)) expect(colour).toMatch(hex)
    expect(config.palette.valid).toMatch(hex)
    expect(config.palette.invalid).toMatch(hex)
    for (const colour of Object.values(config.palette.ui)) expect(colour).toMatch(hex)
  })

  it('has a save schema version', () => {
    expect(Number.isInteger(config.saveSchemaVersion)).toBe(true)
    expect(config.saveSchemaVersion).toBeGreaterThanOrEqual(1)
  })

  it('exposes wide, readonly config types', () => {
    expectTypeOf(config.rendering.quality).toEqualTypeOf<Quality>()
    expectTypeOf(config.items[0]).toEqualTypeOf<ItemDef>()
    expectTypeOf(config.world.maxStack).toEqualTypeOf<number>()
    expect(config.items.find((item) => item.id === 'missing')).toBeUndefined()
    const mutate = () => {
      // @ts-expect-error CONFIG is readonly
      config.world.maxStack = 99
    }
    expect(mutate).toBeTypeOf('function')
  })
})
