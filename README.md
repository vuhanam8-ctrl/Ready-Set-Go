# Ready Set Go

Red background with one transparent, centered model area. No visible text or controls.

## Live2D integration

The page preloads the owner's unchanged Cubism Core runtime from Cubism SDK for Web 5-r.5 at runtime/live2dcubismcore.min.js. No SDK sample models are included. See THIRD_PARTY_NOTICES.md for licensing and publication requirements.

The model loader uses live2d-web 0.9.0, whose documented Cubism 5.3 integration uses the Framework 5-r.5 adapter. The owner-supplied joe2CUT model is configured in model-config.js. Its exported files are in models/work; OpeningPose.motion3.json is registered as the looping Idle motion. The model uses full-model fitting with no added rotation or pointer tracking. Browser rendering still needs visual confirmation.

Runtime documentation: https://live2d-web.heonys.dev/docs/en/core-and-models
Official SDK: https://www.live2d.com/en/sdk/download/web/

The page is served directly by GitHub Pages; no build step is required.
