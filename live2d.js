import { modelSource, coreSource } from './model-config.js';

// Render the exported model upright, using its authored looping opening motion.
if (modelSource) {
  try {
    const { createLive2D } = await import('https://esm.sh/live2d-web@0.9.0');
    const character = await createLive2D({
      container: document.querySelector('#model-main'),
      coreUrl: new URL(coreSource, import.meta.url).href,
      src: new URL(modelSource, import.meta.url).href,
      fit: 'full',
      idleMotion: 'Idle',
      followPointer: false,
    });
    const onVisibility = () => document.hidden ? character.pause() : character.resume();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => {
      document.removeEventListener('visibilitychange', onVisibility);
      character.dispose();
    }, { once: true });
  } catch (error) {
    console.error('Live2D model could not load:', error);
  }
}
