# Ready Set Go

Red background with one transparent, centered model area. No visible text or controls.

## Live2D integration

The loader uses live2d-web 0.9.0, whose documented Cubism 5.3 integration uses the Framework 5-r.5 adapter. The model and Cubism Core are not included yet, so the stage intentionally stays empty.

When the owner supplies the exported model folder, preserve all relative file paths and set modelSource in model-config.js to its .model3.json. Supply the matching official Cubism Core 5.3 file at runtime/live2dcubismcore.min.js. Then verify rendering, transparency, motions, and all referenced textures with the actual model before claiming runtime compatibility is tested.

Runtime documentation: https://live2d-web.heonys.dev/docs/en/core-and-models
Official SDK: https://www.live2d.com/en/sdk/download/web/

The page is served directly by GitHub Pages; no build step is required.
