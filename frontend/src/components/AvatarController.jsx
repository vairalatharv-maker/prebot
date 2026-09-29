import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function AvatarController({ vrm, resources, reaction = 'neutral' }) {
  const start = useRef(null);
  const blinkUntil = useRef(0);
  const nextBlink = useRef(2.5);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    vrm?.update?.(delta);
    resources.mixer?.update(delta);
    if (!start.current) start.current = {
      headY: resources.head?.rotation.y || 0,
      headX: resources.head?.rotation.x || 0,
      chestX: resources.chest?.rotation.x || 0,
      chestY: resources.chest?.position.y || 0,
      leftEyeX: resources.leftEye?.rotation.x || 0,
      leftEyeY: resources.leftEye?.rotation.y || 0,
      rightEyeX: resources.rightEye?.rotation.x || 0,
      rightEyeY: resources.rightEye?.rotation.y || 0,
      jawX: resources.jaw?.rotation.x || 0,
    };
    resources.armPose?.forEach(({ bone, base, offset }) => bone.quaternion.copy(base).multiply(offset));
    if (resources.head) {
      const nod = reaction === 'positive' ? Math.max(0, Math.sin(elapsed * 5)) * 0.035 : 0;
      const attentiveLean = reaction === 'attentive' ? 0.012 : 0;
      resources.head.rotation.y = start.current.headY + Math.sin(elapsed * 0.47) * 0.035;
      resources.head.rotation.x = start.current.headX + Math.sin(elapsed * 0.7) * 0.012 - nod - attentiveLean;
    }
    if (resources.chest) {
      resources.chest.rotation.x = start.current.chestX + 0.035 + Math.sin(elapsed * 1.5) * 0.012;
      resources.chest.position.y = start.current.chestY + Math.sin(elapsed * 1.25) * 0.006;
    }
    if (resources.leftEye) {
      resources.leftEye.rotation.x = start.current.leftEyeX + Math.sin(elapsed * 0.43) * 0.01;
      resources.leftEye.rotation.y = start.current.leftEyeY + Math.sin(elapsed * 0.61) * 0.018;
    }
    if (resources.rightEye) {
      resources.rightEye.rotation.x = start.current.rightEyeX + Math.sin(elapsed * 0.43) * 0.01;
      resources.rightEye.rotation.y = start.current.rightEyeY + Math.sin(elapsed * 0.61) * 0.018;
    }

    if (elapsed > nextBlink.current) {
      blinkUntil.current = elapsed + 0.13;
      nextBlink.current = elapsed + 2.5 + Math.random() * 2.5;
    }
    const blink = elapsed < blinkUntil.current ? Math.max(0, Math.sin(((blinkUntil.current - elapsed) / 0.13) * Math.PI)) : 0;
    if (resources.hasBlinkLeft || resources.hasBlinkRight) {
      if (resources.hasBlinkLeft) resources.expressionManager.setValue('blinkLeft', blink);
      if (resources.hasBlinkRight) resources.expressionManager.setValue('blinkRight', blink);
      if (resources.hasBlink) resources.expressionManager.setValue('blink', 0);
    } else if (resources.hasBlink) {
      resources.expressionManager.setValue('blink', blink);
    }
    resources.blinkMorphs.forEach(({ influences, index }) => { influences[index] = blink; });
    if (resources.hasHappy) resources.expressionManager.setValue('happy', reaction === 'positive' ? 0.18 : 0);
    resources.reactionMorphs.forEach(({ influences, index }) => { influences[index] = reaction === 'positive' ? 0.16 : 0; });
  });

  return null;
}
