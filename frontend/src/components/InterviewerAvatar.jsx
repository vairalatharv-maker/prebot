import { Component, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, Euler, Quaternion, Vector3 } from 'three';
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

function HomeOfficeBackdrop() {
  return <group position={[0, 0, -1.05]}>
    <mesh position={[0, 1.45, -0.12]}>
      <boxGeometry args={[7.5, 5.2, 0.16]} />
      <meshStandardMaterial color="#292b3d" roughness={0.96} />
    </mesh>
    <mesh position={[0, 1.48, -0.025]}>
      <boxGeometry args={[5.35, 4.88, 0.04]} />
      <meshStandardMaterial color="#3b3948" roughness={0.92} />
    </mesh>
    {[-2.68, 2.68].map((x) => <mesh key={`trim-${x}`} position={[x, 1.46, 0.01]}>
      <boxGeometry args={[0.035, 4.9, 0.04]} />
      <meshStandardMaterial color="#85705e" roughness={0.8} />
    </mesh>)}
    {[-3.05, -2.82, 2.82, 3.05].map((x) => <mesh key={`slat-${x}`} position={[x, 1.46, 0.025]}>
      <boxGeometry args={[0.12, 4.9, 0.08]} />
      <meshStandardMaterial color="#493b39" roughness={0.78} />
    </mesh>)}
    <mesh position={[0, -0.88, 0.015]}>
      <boxGeometry args={[7.5, 0.08, 0.12]} />
      <meshStandardMaterial color="#89705a" roughness={0.8} />
    </mesh>
    <group position={[2.05, 0.93, 0.12]}>
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[1.25, 0.1, 0.28]} />
        <meshStandardMaterial color="#705c4e" roughness={0.72} />
      </mesh>
      {[-0.22, 0, 0.22].map((x, index) => <mesh key={`book-${x}`} position={[x, 0.16, 0.005]} rotation={[0, 0, index === 1 ? 0 : -0.06]}>
        <boxGeometry args={[0.16, 0.28 + (index === 1 ? 0.05 : 0), 0.14]} />
        <meshStandardMaterial color={['#746b83', '#a58d72', '#526679'][index]} roughness={0.9} />
      </mesh>)}
      <mesh position={[0.58, 0.18, 0.02]}>
        <cylinderGeometry args={[0.09, 0.12, 0.25, 16]} />
        <meshStandardMaterial color="#b58d78" roughness={0.9} />
      </mesh>
      {[-0.08, 0, 0.08].map((x, index) => <mesh key={`leaf-${x}`} position={[0.58 + x, 0.39 + (index === 1 ? 0.06 : 0), 0]} rotation={[0, 0, x * 2]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial color="#73826b" roughness={0.95} />
      </mesh>)}
    </group>
    <group position={[-2.1, 2.42, 0.08]}>
      <mesh>
        <boxGeometry args={[0.88, 0.72, 0.08]} />
        <meshStandardMaterial color="#aa9077" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <boxGeometry args={[0.72, 0.56, 0.025]} />
        <meshStandardMaterial color="#555064" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.071]}>
        <circleGeometry args={[0.17, 32]} />
        <meshStandardMaterial color="#9a8b91" roughness={0.9} />
      </mesh>
    </group>
  </group>;
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
    const namedBone = (pattern) => {
      let match = null;
      scene.traverse((object) => { if (!match && object.isBone && pattern.test(object.name)) match = object; });
      return match;
    };
    const armPose = [
      { bone: vrm?.humanoid?.getNormalizedBoneNode?.('leftUpperArm') || namedBone(/left.*upper.?arm/i), offset: new Quaternion().setFromEuler(new Euler(0, -0.12, -1.08)) },
      { bone: vrm?.humanoid?.getNormalizedBoneNode?.('rightUpperArm') || namedBone(/right.*upper.?arm/i), offset: new Quaternion().setFromEuler(new Euler(0, 0.12, 1.08)) },
      { bone: vrm?.humanoid?.getNormalizedBoneNode?.('leftLowerArm') || namedBone(/left.*lower.?arm/i), offset: new Quaternion().setFromEuler(new Euler(0, -0.58, -0.3)) },
      { bone: vrm?.humanoid?.getNormalizedBoneNode?.('rightLowerArm') || namedBone(/right.*lower.?arm/i), offset: new Quaternion().setFromEuler(new Euler(0, 0.58, 0.3)) },
    ].filter(({ bone }) => bone).map(({ bone, offset }) => ({ bone, base: bone.quaternion.clone(), offset }));
    const mixer = gltf.animations?.length ? new AnimationMixer(scene) : null;
    return {
      scene, box, center, height, scale, morphs, blinkMorphs, reactionMorphs,
      expressionManager, expressions,
      hasBlink: Boolean(expressionManager?.getExpression?.('blink')),
      hasBlinkLeft: Boolean(expressionManager?.getExpression?.('blinkLeft')),
      hasBlinkRight: Boolean(expressionManager?.getExpression?.('blinkRight')),
      hasHappy: Boolean(expressionManager?.getExpression?.('happy')),
      head, chest,
      leftEye: vrm?.humanoid?.getNormalizedBoneNode?.('leftEye'),
      rightEye: vrm?.humanoid?.getNormalizedBoneNode?.('rightEye'),
      jaw, armPose, baseJawX: jaw?.rotation.x || 0, mixer,
    };
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
        <Canvas className="ai-avatar-background-canvas" dpr={1} frameloop="demand" camera={{ position: [0, 1.88, 2.65], fov: 30 }} onCreated={({ camera }) => { camera.lookAt(0, 1.88, 0); }} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}>
          <HomeOfficeBackdrop />
          <ambientLight intensity={1.35} />
          <directionalLight position={[2, 3, 4]} intensity={2} />
          <directionalLight position={[-2, 1, 1]} intensity={0.65} color="#aa9aff" />
          <pointLight position={[2.45, 2.15, 0.6]} intensity={0.7} distance={4} color="#e7bd95" />
        </Canvas>
        <Canvas className="ai-avatar-canvas" fallback={<MissingModel message="3D rendering is unavailable in this browser." />} dpr={[1, 1.5]} frameloop="always" camera={{ position: [0, 1.88, 2.65], fov: 30 }} onCreated={({ camera, gl }) => { camera.lookAt(0, 1.88, 0); gl.setClearColor(0x000000, 0); }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={1.35} />
          <directionalLight position={[2, 3, 4]} intensity={2} />
          <directionalLight position={[-2, 1, 1]} intensity={0.65} color="#aa9aff" />
          <Suspense fallback={<AvatarLoading />}><AvatarModel key={modelUrl} src={modelUrl} speaking={speaking} reaction={reaction} visemeRef={visemeRef} /></Suspense>
        </Canvas>
      </ModelBoundary>}
      <span className={`ai-avatar-speaking-indicator ${speaking ? 'is-active' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
    <div className="ai-interviewer-label"><strong>Anaya</strong><span>AI Interviewer</span>{speaking && <span className="ai-avatar-speaking-caption">Speaking</span>}</div>
  </section>;
}
