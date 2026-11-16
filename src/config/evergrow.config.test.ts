import { describe, expect, it } from 'vitest'
import { evergrowConfig as config } from './evergrow.config'
import type { TileType } from './evergrow.config'

const TILE_TYPES: TileType[] = ['grass', 'land', 'water']

describe('evergrow config', () => {
  it('has sane world bounds', () => {
    expect(config.world.maxSize).toBeGreaterThan(0)
    expect(config.world.maxSize).toBeLessThanOrEqual(512)
    expect(config.world.startZone).toBeGreaterThanOrEqual(1)
    expect(config.world.startZone % 2).toBe(0)
    expect(config.world.buildableRing).toBeGreaterThanOrEqual(0)
    expect(config.world.maxStack).toBeGreaterThanOrEqual(1)
    expect(config.world.maxStack).toBeLessThanOrEqual(64)
    expect(config.world.tileThickness).toBeGreaterThan(0)
    expect(config.world.waterMaxStep).toBeGreaterThanOrEqual(0)
    expect(config.world.chunkSize).toBeGreaterThan(0)
  })

  it('has a non-negative, increasing task economy', () => {
    const { taskReward, subtaskShare, sellRefund, tileCost, allowNegativeCoins } = config.economy
    const rewards = Object.values(taskReward)
    expect(rewards.every((reward) => reward >= 0)).toBe(true)
    expect(taskReward.tiny).toBeLessThan(taskReward.small)
    expect(taskReward.small).toBeLessThan(taskReward.medium)
    expect(taskReward.medium).toBeLessThan(taskReward.big)
    expect(subtaskShare).toBeGreaterThan(0)
    expect(subtaskShare).toBeLessThanOrEqual(1)
    expect(sellRefund).toBeGreaterThanOrEqual(0)
    expect(sellRefund).toBeLessThanOrEqual(1)
    expect(tileCost).toBeGreaterThanOrEqual(0)
    expect(typeof allowNegativeCoins).toBe('boolean')
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

  it('keeps camera limits ordered and above the ground', () => {
    const { camera } = config
    expect(camera.minPolarDeg).toBeGreaterThan(0)
    expect(camera.minPolarDeg).toBeLessThan(camera.maxPolarDeg)
    expect(camera.maxPolarDeg).toBeLessThan(90)
    expect(camera.minZoom).toBeGreaterThan(0)
    expect(camera.minZoom).toBeLessThan(camera.maxZoom)
    expect(camera.transitionMs).toBeGreaterThan(0)
    expect(camera.snapRotateDeg).toBeGreaterThan(0)
    expect(camera.snapRotateDeg % 90).toBe(0)
  })

  it('has sane motion timings', () => {
    const { motion } = config
    expect(motion.dropFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.digUpFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.tileAddFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.coinCountUpMs).toBeGreaterThanOrEqual(0)
    expect(motion.gridFadeMs).toBeGreaterThanOrEqual(0)
    expect(motion.panelMs).toBeGreaterThanOrEqual(0)
    expect(motion.ghostLerpMs).toBeGreaterThanOrEqual(0)
    expect(motion.ghostLerpMs).toBeLessThanOrEqual(120)
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
    expect(rendering.maxPointLights).toBeGreaterThanOrEqual(0)
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

  it('has a valid, unique item catalog', () => {
    const ids = new Set<string>()
    for (const item of config.items) {
      expect(item.id.length).toBeGreaterThan(0)
      expect(ids.has(item.id)).toBe(false)
      ids.add(item.id)
      expect(item.price).toBeGreaterThanOrEqual(0)
      expect(item.footprint[0]).toBeGreaterThanOrEqual(1)
      expect(item.footprint[1]).toBeGreaterThanOrEqual(1)
      expect(TILE_TYPES).toContain(item.defaultTile)
      expect(item.allowedTiles.length).toBeGreaterThan(0)
      expect(item.allowedTiles).toContain(item.defaultTile)
      if (item.connectable) expect(item.rotatable).toBe(false)
    }
  })

  it('starts with an affordable, known starter item', () => {
    expect(config.starter.coins).toBeGreaterThanOrEqual(0)
    expect(config.starter.items.length).toBe(1)
    const ids = new Set(config.items.map((item) => item.id))
    for (const id of config.starter.items) expect(ids.has(id)).toBe(true)
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
})
