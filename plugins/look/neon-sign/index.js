// Pilot Look 1: neon-sign (coupled glass-tube marks + light-mapped brick ground + HDR bloom finish).
(function (root) {
  'use strict';
  const plugin = {
    kind: 'look',
    id: 'neon-sign',
    slots: {
      palette: 'neon-night',
      ground: 'neon-wall',
      marks: 'neon-tube',
      type: 'neon-display',
      composition: 'split-stage',
      progression: 'beat-escalate',
      motion: 'snappy-spring',
      transitions: 'tube-flicker',
      finish: 'neon-bloom',
      host: 'host-ink-mascot',
    },
    identitySlots: ['marks', 'finish'],
    supportedOverrides: {
      palette: ['neon-night', 'risograph', 'cyber-amber', 'studio-dark'],
      ground: ['neon-wall', 'sdf-field', 'warm-paper'],
      type: ['neon-display', 'geometric-tech'],
      composition: ['split-stage', 'center-stage', 'vertical-stack'],
      motion: ['snappy-spring', 'smooth-drift'],
      transitions: ['tube-flicker', 'dissolve'],
      host: ['host-ink-mascot', 'host-cyber-bust', 'host-geometric-bot', 'host-pixel-sprite'],
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['look/neon-sign'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
