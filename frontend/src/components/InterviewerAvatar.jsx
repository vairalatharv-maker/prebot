import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, MathUtils, Vector3 } from 'three';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];
const VISEME_KEYS = [/^(aa|ih|ou|ee|oh|a|i|u|e|o)$/i, /viseme.*(aa|ih|ou|ee|oh)/i, /mouth.*(open|aa|ih|ou|ee|oh)/i, /jaw.?open/i];
const configuredLoaders = new WeakSet();
const modelReferences = new Map();
const modelReleaseTimers = new Map();

function retainModel(src, scene) {
  clearTimeout(modelReleaseTimers.get(src));
  modelReleaseTimers.delete(src);
  const current = modelReferences.get(src);
  modelReferences.set(src, { count: (current?.count || 0) + 1, scene });
}

function releaseModel(src, scene) {
  const current = modelReferences.get(src);
  if (!current) return;
  current.count -= 1;
  if (current.count > 0) return;
  const timer = setTimeout(() => {
    const last = modelReferences.get(src);
    if (last?.count > 0) return;
    disposeScene(last?.scene || scene);
    useLoader.clear(GLTFLoader, src);
    modelReferences.delete(src);
    modelReleaseTimers.delete(src);
  }, 0);
  modelReleaseTimers.set(src, timer);
}

function disposeScene(scene) {
  const resources = new Set();
  scene.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      resources.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) resources.add(value);
        if (value?.value?.isTexture) resources.add(value.value);
      });
    });
  });
  resources.forEach((resource) => resource.dispose?.());
}

class ModelBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError?.(error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function FallbackPortrait({ speaking, message }) {
  return <div className={`ai-interviewer-fallback ${speaking ? 'is-speaking' : ''}`} role="img" aria-label={`Anaya AI interviewer portrait. ${message}`}>
    <img src="/images/prepbot-interviewer.png" alt="" />
    <span className="ai-fallback-mouth" aria-hidden="true" />
    <span className="ai-avatar-fallback-note">{message}</span>
  </div>;
}

function AvatarLoading() {
  return <Html center><span className="ai-avatar-loading">Loading Anaya…</span></Html>;
}

function AvatarModel({ src, speaking, onMouthFallback }) {
  const gltf = useLoader(GLTFLoader, src, (instance) => {
    if (!configuredLoaders.has(instance)) {
      instance.register((parser) => new VRMLoaderPlugin(parser));
      configuredLoaders.add(instance);
    }
  });
  const vrm = gltf.userData.vrm;
  const scene = vrm?.scene || gltf.scene;
  const resources = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const height = Math.max(box.getSize(new Vector3()).y, 0.01);
    const scale = 2.5 / height;
    const morphs = [];
    scene.traverse((object) => {
      if (!object.isMesh || !object.morphTargetDictionary || !object.morphTargetInfluences) return;
      Object.entries(object.morphTargetDictionary).forEach(([name, index]) => {
        if (VISEME_KEYS.some((pattern) => pattern.test(name))) morphs.push({ influences: object.morphTargetInfluences, index, name });
      });
    });
    const expressionManager = vrm?.expressionManager;
    const expressions = expressionManager ? VISEMES.filter((name) => expressionManager.getExpression?.(name)) : [];
    const hasBlink = Boolean(expressionManager?.getExpression?.('blink'));
    const head = vrm?.humanoid?.getNormalizedBoneNode?.('head') || null;
    const chest = vrm?.humanoid?.getNormalizedBoneNode?.('chest') || vrm?.humanoid?.getNormalizedBoneNode?.('upperChest') || null;
    const jaw = vrm?.humanoid?.getNormalizedBoneNode?.('jaw') || null;
    const mixer = gltf.animations?.length ? new AnimationMixer(scene) : null;
    return { box, scale, morphs, expressionManager, expressions, hasBlink, head, chest, jaw, mixer };
  }, [scene, vrm, gltf.animations]);
  const startRotations = useRef(null);
  const blinkUntil = useRef(0);
  const nextBlink = useRef(2.5);

  useEffect(() => {
    retainModel(src, scene);
    onMouthFallback(resources.expressions.length === 0 && resources.morphs.length === 0 && !resources.jaw);
    resources.mixer?.clipAction(gltf.animations[0]).play();
    return () => {
      onMouthFallback(false);
      resources.mixer?.stopAllAction();
      if (resources.mixer) resources.mixer.uncacheRoot(scene);
      releaseModel(src, scene);
    };
  }, [gltf.animations, onMouthFallback, resources, scene, src]);

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    vrm?.update?.(delta);
    resources.mixer?.update(delta);
    if (!startRotations.current) startRotations.current = {
      headY: resources.head?.rotation.y || 0,
      headX: resources.head?.rotation.x || 0,
      chestX: resources.chest?.rotation.x || 0,
      jawX: resources.jaw?.rotation.x || 0,
    };
    const base = startRotations.current;
    if (resources.head) {
      resources.head.rotation.y = base.headY + Math.sin(elapsed * 0.47) * 0.035;
      resources.head.rotation.x = base.headX + Math.sin(elapsed * 0.7) * 0.012;
    }
    if (resources.chest) resources.chest.rotation.x = base.chestX + Math.sin(elapsed * 1.5) * 0.012;

    if (elapsed > nextBlink.current) {
      blinkUntil.current = elapsed + 0.13;
      nextBlink.current = elapsed + 2.5 + Math.random() * 2.5;
    }
    const blink = elapsed < blinkUntil.current ? Math.sin(((blinkUntil.current - elapsed) / 0.13) * Math.PI) : 0;
    if (resources.hasBlink) resources.expressionManager.setValue('blink', Math.max(0, blink));

    let mouth = 0;
    let vowelIndex = 0;
    if (speaking) {
      const pulse = Math.sin(elapsed * 11.5);
      mouth = MathUtils.clamp(0.12 + Math.max(0, pulse) * 0.7, 0, 0.85);
      vowelIndex = Math.floor((elapsed * 3.2) % VISEMES.length);
    }
    if (resources.expressions.length) {
      resources.expressions.forEach((name) => resources.expressionManager.setValue(name, speaking && name === VISEMES[vowelIndex] ? mouth : 0));
    }
    resources.morphs.forEach(({ influences, index, name }) => {
      const vowel = name.match(/(aa|ih|ou|ee|oh|a|i|u|e|o)$/i)?.[1]?.toLowerCase();
      const selected = vowel ? vowel === VISEMES[vowelIndex] || vowel === ['a', 'i', 'u', 'e', 'o'][vowelIndex] : true;
      influences[index] = speaking && selected ? mouth : 0;
    });
    if (!resources.expressions.length && !resources.morphs.length && resources.jaw) {
      resources.jaw.rotation.x = base.jawX + (speaking ? mouth * 0.13 : 0);
    }
  });

  return <group position={[0, -resources.box.min.y * resources.scale, 0]} scale={resources.scale}>
    <primitive object={scene} dispose={null} />
  </group>;
}

export default function InterviewerAvatar({ speaking = false, modelUrl = '/avatar/anaya.vrm' }) {
  const [mouthFallback, setMouthFallback] = useState(false);
  const [modelState, setModelState] = useState('checking');
  const setFallback = useMemo(() => (enabled) => setMouthFallback(enabled), []);
  useEffect(() => {
    let active = true;
    setModelState('checking');
    fetch(modelUrl, { method: 'HEAD' })
      .then((response) => { if (active) setModelState(response.ok ? 'ready' : 'missing'); })
      .catch(() => { if (active) setModelState('missing'); });
    return () => { active = false; };
  }, [modelUrl]);
  const fallback = <FallbackPortrait speaking={speaking} message={modelState === 'checking' ? 'Loading Anaya 3D model…' : '3D model not added yet'} />;
  const canvasFallback = <FallbackPortrait speaking={speaking} message="3D rendering is unavailable in this browser" />;

  return <section className="ai-interviewer-identity" aria-label="AI interviewer Anaya">
    <div className={`ai-interviewer-avatar ${speaking ? 'is-speaking' : ''}`}>
      <div className="ai-avatar-halo" />
      {modelState !== 'ready' ? fallback : <ModelBoundary fallback={<FallbackPortrait speaking={speaking} message="Could not load the 3D model" />} onError={() => setModelState('missing')}>
        <Canvas className="ai-avatar-canvas" fallback={canvasFallback} dpr={[1, 1.5]} frameloop="always" camera={{ position: [0, 1.75, 3.45], fov: 36 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={1.35} />
          <directionalLight position={[2, 3, 4]} intensity={2} />
          <directionalLight position={[-2, 1, -2]} intensity={0.65} color="#aa9aff" />
          <Suspense fallback={<AvatarLoading />}><AvatarModel key={modelUrl} src={modelUrl} speaking={speaking} onMouthFallback={setFallback} /></Suspense>
        </Canvas>
      </ModelBoundary>}
      {mouthFallback && modelState === 'ready' && <span className={`ai-avatar-mouth-fallback ${speaking ? 'is-speaking' : ''}`} aria-hidden="true" />}
      <div className="ai-avatar-spark" aria-hidden="true">✦</div>
      <span className={`ai-avatar-speaking-indicator ${speaking ? 'is-active' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
    <div className="ai-interviewer-label"><strong>Anaya</strong><span>AI Interviewer</span>{speaking && <span className="ai-avatar-speaking-caption">Speaking</span>}</div>
  </section>;
}
