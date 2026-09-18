# R3F Postprocessing Bloom

React Three Fiber demo with selective bloom (`@react-three/postprocessing`), Leva controls, and an optional CSS panel glow.

## Routes

- `/` — WebGL bloom + CSS glow behind hovered box
- `/bloom-webgl` — WebGL bloom only (no CSS glow)
- `/bloom-webgpu` — WebGPU TSL bloom + CSS glow
- `/bloom-webgpu-canvas` — WebGPU TSL bloom only

WebGPU pages need a browser with WebGPU enabled.

## Develop

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```
