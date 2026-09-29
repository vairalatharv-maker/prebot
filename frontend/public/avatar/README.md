# Local Anaya avatar model

Place a model that you have permission to use at `frontend/public/avatar/anaya.vrm`.
VRM 1.0 and VRM 0.x models are loaded through `@pixiv/three-vrm`. The component
also accepts a GLB by passing `modelUrl="/avatar/anaya.glb"` to `InterviewerAvatar`.

For facial lip-sync, choose a VRM model with the standard `aa`, `ih`, `ou`, `ee`,
and `oh` expressions (and `blink` if available). Without facial expressions, the
component falls back to morph targets, a jaw bone, and finally a small visual
mouth animation. No model is bundled or fetched from a remote URL.
