import { Component, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, Vector3 } from 'three';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { Box } from 'lucide-react';
import AvatarLipSync from './AvatarLipSync.jsx';
import AvatarController from './AvatarController.jsx';

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

function MissingModel({ message }) {
  return <div className="ai-avatar-missing" role="status" aria-live="polite">
    <span className="ai-avatar-missing-icon"><Box size={25} strokeWidth={1.6} /></span>
    <strong>Anaya · 3D interviewer</strong>
    <span>{message}</span>
    <small>Place your model at<br/><code>frontend/public/avatar/anaya.vrm</code></small>
  </div>;
}

function AvatarLoading() {
  return <Html center><span className="ai-avatar-loading">Loading Anaya…</span></Html>;
}

function AvatarModel({ src, speaking, reaction, visemeRef }) {
  const gltf = useLoader(GLTFLoader, src, (loader) => {
    if (!configuredLoaders.has(loader)) {
      loader.register((parser) => new VRMLoaderPlugin(parser));
      configuredLoaders.add(loader);
    }
  });
  const vrm = gltf.userData.vrm;
  if (!vrm || vrm.meta?.metaVersion !== '1') {
    throw new Error('Anaya must be a valid VRM 1.0 model.');
  }
  const scene = vrm?.scene || gltf.scene;
  const resources = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const height = Math.max(box.getSize(new Vector3()).y, 0.01);
    const scale = 2.5 / height;
    const center = box.getCenter(new Vector3());
    const morphs = [];
    const blinkMorphs = [];
    const reactionMorphs = [];
    scene.traverse((object) => {
      if (!object.isMesh || !object.morphTargetDictionary || !object.morphTargetInfluences) return;
      Object.entries(object.morphTargetDictionary).forEach(([name, index]) => {
        if (VISEME_KEYS.some((pattern) => pattern.test(name))) {
          const vowel = name.match(/(aa|ih|ou|ee|oh|a|i|u|e|o)$/i)?.[1]?.toLowerCase() || null;
          morphs.push({ influences: object.morphTargetInfluences, index, vowel });
        }
        if (/blink|eye.?close/i.test(name)) blinkMorphs.push({ influences: object.morphTargetInfluences, index });
        if (/happy|smile/i.test(name)) reactionMorphs.push({ influences: object.morphTargetInfluences, index });
      });
    });
    const expressionManager = vrm?.expressionManager;
    const expressions = expressionManager ? ['aa', 'ih', 'ou', 'ee', 'oh'].filter((name) => expressionManager.getExpression?.(name)) : [];
    const hasBlink = Boolean(expressionManager?.getExpression?.('blink'));
    const hasHappy = Boolean(expressionManager?.getExpression?.('happy'));
    let namedHead = null;
    let namedChest = null;
    let namedJaw = null;
    scene.traverse((object) => {
      if (!namedHead && /(head|face)/i.test(object.name) && (object.isBone || object.type === 'Group')) namedHead = object;
      if (!namedChest && /(chest|upper.?spine|spine2)/i.test(object.name) && object.isBone) namedChest = object;
      if (!namedJaw && /jaw|mandible/i.test(object.name) && object.isBone) namedJaw = object;
    });
    const head = vrm?.humanoid?.getNormalizedBoneNode?.('head') || namedHead;
    const chest = vrm?.humanoid?.getNormalizedBoneNode?.('chest') || vrm?.humanoid?.getNormalizedBoneNode?.('upperChest') || namedChest;
    const jaw = vrm?.humanoid?.getNormalizedBoneNode?.('jaw') || namedJaw;
    const mixer = gltf.animations?.length ? new AnimationMixer(scene) : null;
    return { scene, box, center, height, scale, morphs, blinkMorphs, reactionMorphs, expressionManager, expressions, hasBlink, hasHappy, head, chest, jaw, baseJawX: jaw?.rotation.x || 0, mixer };
  }, [scene, vrm, gltf.animations]);

  useEffect(() => {
    retainModel(src, scene);
    resources.mixer?.clipAction(gltf.animations[0]).play();
    return () => {
      resources.mixer?.stopAllAction();
      if (resources.mixer) resources.mixer.uncacheRoot(scene);
      releaseModel(src, scene);
    };
  }, [gltf.animations, resources, scene, src]);

  return <group position={[0, -resources.box.min.y * resources.scale, 0]} scale={resources.scale}>
    <primitive object={scene} dispose={null} />
    <AvatarController vrm={vrm} resources={resources} reaction={reaction} />
    <AvatarLipSync resources={resources} speaking={speaking} visemeRef={visemeRef} />
  </group>;
}

export default function InterviewerAvatar({ speaking = false, reaction = 'neutral', visemeRef, modelUrl = '/avatar/anaya.vrm' }) {
  const [modelState, setModelState] = useState('checking');
  useEffect(() => {
    let active = true;
    setModelState('checking');
    fetch(modelUrl, { method: 'HEAD' })
      .then((response) => {
        const contentType = response.headers.get('content-type')?.toLowerCase() || '';
        const isModelFile = response.ok && !contentType.includes('text/html');
        if (active) setModelState(isModelFile ? 'ready' : 'missing');
      })
      .catch(() => { if (active) setModelState('missing'); });
    return () => { active = false; };
  }, [modelUrl]);
  const missingModel = <MissingModel message={modelState === 'checking' ? 'Loading the local VRM 1.0 interviewer…' : modelState === 'error' ? 'The model could not be rendered. Check that anaya.vrm is a valid VRM 1.0 file.' : 'The Anaya model file is missing. Add it at the path below to enable the 3D interviewer.'} />;

  return <section className="ai-interviewer-identity" aria-label="AI interviewer Anaya">
    <div className={`ai-interviewer-avatar ${speaking ? 'is-speaking' : ''}`}>
      <div className="ai-avatar-halo" />
      {modelState !== 'ready' ? missingModel : <ModelBoundary fallback={<MissingModel message="The local 3D model could not be rendered." />} onError={() => setModelState('error')}>
        <Canvas className="ai-avatar-canvas" fallback={<MissingModel message="3D rendering is unavailable in this browser." />} dpr={[1, 1.5]} frameloop="always" camera={{ position: [0, 1.75, 3.45], fov: 36 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={1.35} />
          <directionalLight position={[2, 3, 4]} intensity={2} />
          <directionalLight position={[-2, 1, -2]} intensity={0.65} color="#aa9aff" />
          <Suspense fallback={<AvatarLoading />}><AvatarModel key={modelUrl} src={modelUrl} speaking={speaking} reaction={reaction} visemeRef={visemeRef} /></Suspense>
        </Canvas>
      </ModelBoundary>}
      <span className={`ai-avatar-speaking-indicator ${speaking ? 'is-active' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
    <div className="ai-interviewer-label"><strong>Anaya</strong><span>AI Interviewer</span>{speaking && <span className="ai-avatar-speaking-caption">Speaking</span>}</div>
  </section>;
}
