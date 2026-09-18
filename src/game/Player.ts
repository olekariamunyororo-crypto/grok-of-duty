import * as pc from 'playcanvas'

export interface PlayerInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  sprint: boolean
  jump: boolean
  fire: boolean
  reload: boolean
}

export interface PlayerController {
  update: (dt: number, input: PlayerInput) => void
}

export function createPlayer(app: pc.Application) {
  const playerEntity = new pc.Entity('Player')
  playerEntity.setPosition(0, 1.7, 5)
  app.root.addChild(playerEntity)

  const camera = new pc.Entity('Camera')
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.45, 0.55, 0.68),
    farClip: 200,
    nearClip: 0.08,
    fov: 75,
  })
  camera.setLocalPosition(0, 0, 0)
  playerEntity.addChild(camera)

  const speed = 6.5
  const sprintMultiplier = 1.65
  const jumpForce = 7.5
  const gravity = -22

  let velocityY = 0
  let isGrounded = true
  const playerHeight = 1.7

  const forward = new pc.Vec3()
  const right = new pc.Vec3()
  const move = new pc.Vec3()

  const controller: PlayerController = {
    update(dt: number, input: PlayerInput) {
      const angles = playerEntity.getEulerAngles()
      const yawRad = (angles.y * Math.PI) / 180

      forward.set(-Math.sin(yawRad), 0, -Math.cos(yawRad))
      right.set(Math.cos(yawRad), 0, -Math.sin(yawRad))

      move.set(0, 0, 0)
      if (input.forward) move.add(forward)
      if (input.backward) move.sub(forward)
      if (input.right) move.add(right)
      if (input.left) move.sub(right)

      if (move.lengthSq() > 0) {
        move.normalize()
        const currentSpeed = input.sprint ? speed * sprintMultiplier : speed
        move.mulScalar(currentSpeed * dt)

        const pos = playerEntity.getPosition()
        pos.add(move)

        pos.x = Math.max(-24, Math.min(24, pos.x))
        pos.z = Math.max(-24, Math.min(24, pos.z))
        playerEntity.setPosition(pos)
      }

      if (input.jump && isGrounded) {
        velocityY = jumpForce
        isGrounded = false
      }

      velocityY += gravity * dt

      const pos = playerEntity.getPosition()
      pos.y += velocityY * dt

      if (pos.y <= playerHeight) {
        pos.y = playerHeight
        velocityY = 0
        isGrounded = true
      }

      playerEntity.setPosition(pos)
    },
  }

  return { camera, playerEntity, controller }
}
