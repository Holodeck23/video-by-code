// Pilot Look 2: doodle-ink (coupled 8 fps hand-drawn ink-boil marks on warm matte notebook paper).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'look',
    id: 'doodle-ink',
    slots: {
      palette: 'warm-editorial',
      ground: 'warm-paper',
      marks: 'ink-boil',
      type: 'marker-hand',
      composition: 'notebook-spread',
      progression: 'notebook-build',
      motion: 'boil-step',
      transitions: 'page-wipe',
      finish: 'paper-grain',
      host: 'host-ink-mascot',
    },
    identitySlots: ['marks', 'finish'],
    supportedOverrides: {
      palette: ['warm-editorial', 'risograph', 'monochrome-ink'],
      ground: ['warm-paper', 'neon-wall'],
      type: ['marker-hand', 'editorial-serif'],
      composition: ['notebook-spread', 'split-stage', 'vertical-stack'],
      motion: ['boil-step', 'snappy-spring'],
      transitions: ['page-wipe', 'dissolve'],
      host: ['host-ink-mascot', 'host-pixel-sprite', 'host-geometric-bot', 'host-cyber-bust'],
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['look/doodle-ink'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
