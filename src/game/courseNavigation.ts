import * as THREE from 'three'

export type NavigationObstacle = {
  id: string
  x: number
  z: number
  radius: number
}

export type NavigationBoundary = {
  x: number
  z: number
  radius: number
}

export const PLAYER_COLLISION_RADIUS = 0.26

const LOOK_AHEAD = 1.45
const STEERING_MARGIN = 0.14

function sideFor(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0
  return hash % 2 === 0 ? 1 : -1
}

export function steerAroundObstacles(
  position: THREE.Vector3,
  desired: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
): void {
  const speed = Math.hypot(desired.x, desired.z)
  if (speed < 0.001) return

  const directionX = desired.x / speed
  const directionZ = desired.z / speed
  let steeringX = 0
  let steeringZ = 0

  for (const obstacle of obstacles) {
    const relativeX = obstacle.x - position.x
    const relativeZ = obstacle.z - position.z
    const forward = relativeX * directionX + relativeZ * directionZ
    const maxForward = LOOK_AHEAD + obstacle.radius
    if (forward < -PLAYER_COLLISION_RADIUS || forward > maxForward) continue

    const lateralX = relativeX - directionX * forward
    const lateralZ = relativeZ - directionZ * forward
    const lateralDistance = Math.hypot(lateralX, lateralZ)
    const clearance = obstacle.radius + PLAYER_COLLISION_RADIUS + STEERING_MARGIN
    if (lateralDistance >= clearance) continue

    let awayX: number
    let awayZ: number
    if (lateralDistance > 0.001) {
      awayX = -lateralX / lateralDistance
      awayZ = -lateralZ / lateralDistance
    } else {
      const side = sideFor(obstacle.id)
      awayX = -directionZ * side
      awayZ = directionX * side
    }

    const lateralUrgency = 1 - lateralDistance / clearance
    const forwardUrgency = 1 - Math.max(0, forward) / maxForward * 0.55
    const strength = lateralUrgency * forwardUrgency * speed * 1.75
    steeringX += awayX * strength
    steeringZ += awayZ * strength
  }

  desired.x += steeringX
  desired.z += steeringZ
  const steeredSpeed = Math.hypot(desired.x, desired.z)
  if (steeredSpeed > speed && steeredSpeed > 0.001) {
    desired.x = desired.x / steeredSpeed * speed
    desired.z = desired.z / steeredSpeed * speed
  }
}

export function resolveObstacleCollisions(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
): void {
  for (let pass = 0; pass < 2; pass += 1) {
    for (const obstacle of obstacles) {
      let deltaX = position.x - obstacle.x
      let deltaZ = position.z - obstacle.z
      const minimumDistance = obstacle.radius + PLAYER_COLLISION_RADIUS
      const distance = Math.hypot(deltaX, deltaZ)
      if (distance >= minimumDistance) continue

      if (distance < 0.0001) {
        const side = sideFor(obstacle.id)
        deltaX = side
        deltaZ = 0
      } else {
        deltaX /= distance
        deltaZ /= distance
      }

      position.x = obstacle.x + deltaX * minimumDistance
      position.z = obstacle.z + deltaZ * minimumDistance
      const inwardVelocity = velocity.x * deltaX + velocity.z * deltaZ
      if (inwardVelocity < 0) {
        velocity.x -= deltaX * inwardVelocity
        velocity.z -= deltaZ * inwardVelocity
      }
    }
  }
}

export function projectOutsideObstacles(
  target: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
  margin = 0.08,
): void {
  const idleVelocity = new THREE.Vector3()
  const expanded = obstacles.map((obstacle) => ({ ...obstacle, radius: obstacle.radius + margin }))
  resolveObstacleCollisions(target, idleVelocity, expanded)
}

const PATH_SAMPLES = 16
const PATH_POINT_MARGIN = 0.12
const VISIBILITY_MARGIN = 0.04

function planarDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function segmentIsClear(
  start: THREE.Vector3,
  end: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
): boolean {
  const segmentX = end.x - start.x
  const segmentZ = end.z - start.z
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ

  for (const obstacle of obstacles) {
    const relativeX = obstacle.x - start.x
    const relativeZ = obstacle.z - start.z
    const ratio = lengthSquared > 0.000001
      ? THREE.MathUtils.clamp((relativeX * segmentX + relativeZ * segmentZ) / lengthSquared, 0, 1)
      : 0
    const closestX = start.x + segmentX * ratio
    const closestZ = start.z + segmentZ * ratio
    const clearance = obstacle.radius + PLAYER_COLLISION_RADIUS + VISIBILITY_MARGIN
    const distanceSquared = (closestX - obstacle.x) ** 2 + (closestZ - obstacle.z) ** 2
    if (distanceSquared < clearance * clearance - 0.000001) return false
  }

  return true
}

function clampToBoundary(point: THREE.Vector3, boundary?: NavigationBoundary): void {
  if (!boundary) return
  const deltaX = point.x - boundary.x
  const deltaZ = point.z - boundary.z
  const distance = Math.hypot(deltaX, deltaZ)
  if (distance <= boundary.radius || distance < 0.0001) return
  point.x = boundary.x + deltaX / distance * boundary.radius
  point.z = boundary.z + deltaZ / distance * boundary.radius
}

function pointIsWalkable(
  point: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
  boundary?: NavigationBoundary,
): boolean {
  const insideBoundary = !boundary || Math.hypot(point.x - boundary.x, point.z - boundary.z) <= boundary.radius
  return insideBoundary && obstacles.every((obstacle) => (
    Math.hypot(point.x - obstacle.x, point.z - obstacle.z)
      >= obstacle.radius + PLAYER_COLLISION_RADIUS + VISIBILITY_MARGIN
  ))
}

export function planObstaclePath(
  start: THREE.Vector3,
  target: THREE.Vector3,
  obstacles: readonly NavigationObstacle[],
  targetMargin = 0.08,
  boundary?: NavigationBoundary,
): THREE.Vector3[] {
  const origin = start.clone()
  const goal = target.clone()
  clampToBoundary(origin, boundary)
  clampToBoundary(goal, boundary)
  projectOutsideObstacles(origin, obstacles)
  projectOutsideObstacles(goal, obstacles, targetMargin)
  clampToBoundary(origin, boundary)
  clampToBoundary(goal, boundary)

  if (segmentIsClear(origin, goal, obstacles)) return [goal]

  const nodes = [origin, goal]
  for (const obstacle of obstacles) {
    const radius = obstacle.radius + PLAYER_COLLISION_RADIUS + PATH_POINT_MARGIN
    for (let index = 0; index < PATH_SAMPLES; index += 1) {
      const angle = index / PATH_SAMPLES * Math.PI * 2
      const point = new THREE.Vector3(
        obstacle.x + Math.cos(angle) * radius,
        goal.y,
        obstacle.z + Math.sin(angle) * radius,
      )
      if (pointIsWalkable(point, obstacles, boundary)) nodes.push(point)
    }
  }

  const distances = Array(nodes.length).fill(Infinity) as number[]
  const previous = Array(nodes.length).fill(-1) as number[]
  const visited = Array(nodes.length).fill(false) as boolean[]
  distances[0] = 0

  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let current = -1
    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited[index] && (current === -1 || distances[index] < distances[current])) current = index
    }
    if (current === -1 || !Number.isFinite(distances[current])) break
    if (current === 1) break
    visited[current] = true

    for (let next = 0; next < nodes.length; next += 1) {
      if (next === current || visited[next] || !segmentIsClear(nodes[current], nodes[next], obstacles)) continue
      const candidate = distances[current] + planarDistance(nodes[current], nodes[next])
      if (candidate < distances[next]) {
        distances[next] = candidate
        previous[next] = current
      }
    }
  }

  if (previous[1] === -1) return [goal]

  const reversePath: THREE.Vector3[] = []
  let cursor = 1
  while (cursor !== 0 && cursor !== -1) {
    reversePath.push(nodes[cursor].clone())
    cursor = previous[cursor]
  }
  return cursor === 0 ? reversePath.reverse() : [goal]
}
