// Pilot Look 3: crumbs-sdf (audio-reactive signed-distance-field shader world).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'look',
    id: 'crumbs-sdf',
    slots: {
      palette: 'studio-dark',
      ground: 'sdf-field',
      marks: 'sdf-forms',
      type: 'geometric-tech',
      composition: 'center-stage',
      progression: 'musical-arc',
      motion: 'smooth-drift',
      transitions: 'sdf-morph',
      finish: 'sdf-post',
      host: 'host-ink-mascot',
    },
    identitySlots: ['marks', 'finish'],
    supportedOverrides: {
      palette: ['studio-dark', 'neon-night', 'cyber-amber', 'risograph'],
      ground: ['sdf-field', 'neon-wall'],
      type: ['geometric-tech', 'neon-display'],
      composition: ['center-stage', 'split-stage', 'vertical-stack'],
      motion: ['smooth-drift', 'snappy-spring'],
      transitions: ['sdf-morph', 'dissolve'],
      host: ['host-ink-mascot', 'host-geometric-bot', 'host-cyber-bust', 'host-pixel-sprite'],
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['look/crumbs-sdf'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
