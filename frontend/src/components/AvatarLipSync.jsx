import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';

const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];
const VOWELS = ['a', 'i', 'u', 'e', 'o'];

export default function AvatarLipSync({ resources, speaking, visemeRef }) {
  const fallbackMouth = useMemo(() => {
    if (resources.expressions.length || resources.morphs.length || resources.jaw) return null;
    const mouth = new Mesh(new SphereGeometry(1, 16, 10), new MeshBasicMaterial({ color: '#422732' }));
    mouth.name = 'prepbot-fallback-mouth';
    const head = resources.head || resources.scene;
    if (resources.head) mouth.position.set(0, -resources.height * 0.035, resources.height * 0.045);
    else mouth.position.set(resources.center.x, resources.box.min.y + resources.height * 0.73, resources.box.max.z + resources.height * 0.012);
    mouth.scale.set(resources.height * 0.035, resources.height * 0.008, resources.height * 0.006);
    head.add(mouth);
    return mouth;
  }, [resources]);

  useEffect(() => () => {
    if (!fallbackMouth) return;
    fallbackMouth.removeFromParent();
    fallbackMouth.geometry.dispose();
    fallbackMouth.material.dispose();
  }, [fallbackMouth]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const pulse = Math.sin(elapsed * 11.5);
    const amount = speaking ? MathUtils.clamp(0.1 + Math.max(0, pulse) * 0.72, 0, 0.85) : 0;
    const detectedViseme = visemeRef?.current;
    const vowelIndex = detectedViseme && VISEMES.includes(detectedViseme) ? VISEMES.indexOf(detectedViseme) : Math.floor(elapsed * 3.2) % VISEMES.length;
    const selectedExpression = detectedViseme && resources.expressions.includes(detectedViseme)
      ? detectedViseme
      : resources.expressions.length ? resources.expressions[Math.floor(elapsed * 3.2) % resources.expressions.length] : VISEMES[vowelIndex];

    resources.expressions.forEach((name) => resources.expressionManager.setValue(name, speaking && name === selectedExpression ? amount : 0));
    resources.morphs.forEach(({ influences, index, vowel }) => {
      const selected = vowel ? vowel === VISEMES[vowelIndex] || vowel === VOWELS[vowelIndex] : true;
      influences[index] = speaking && selected ? amount : 0;
    });
    if (!resources.expressions.length && !resources.morphs.length && resources.jaw) {
      resources.jaw.rotation.x = resources.baseJawX + (speaking ? amount * 0.13 : 0);
    }
    if (fallbackMouth) fallbackMouth.scale.y = resources.height * (speaking ? 0.008 + amount * 0.025 : 0.004);
  });

  return null;
}
