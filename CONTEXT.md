# R3F postprocessing bloom demo

Standalone demos for WebGL and WebGPU bloom, aligned with hds-web overlay compositing terminology.

## Language

**Overlay bloom**:
Bloom on the 3D scene computed on an opaque HDR plate, then composited over a backdrop beneath the canvas. Halos add light over the void; they do not replace or bloom the backdrop itself.
_Avoid_: full-frame bloom, blooming the starfield or CSS glow layer

**Void punch-through**:
Empty pixels where depth has no solid coverage. Near-black plate color becomes transparent so the backdrop shows; brighter bloom keeps alpha so halos remain visible.
_Avoid_: transparent clear on the bloom plate, alpha-over of a bloomed void

**Strict void**:
Void compositing that suppresses bloom haze in empty pixels—only depth-covered surfaces contribute halo alpha. Used on light-theme chart-style surfaces in hds-web.
_Avoid_: clipping bloom at mesh edges, disabling bloom

**Backdrop void**:
The flat color or layer behind the WebGPU canvas (page chrome, landing void color, or CSS panel glow). Not part of the bloom shader.
_Avoid_: scene.background, bloom source
