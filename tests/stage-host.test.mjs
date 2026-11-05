import test from 'node:test';
import assert from 'node:assert/strict';
import '../plugins/layer/host-pixel-sprite/index.js';
import '../plugins/layer/host-geometric-bot/index.js';
import '../plugins/layer/host-ink-mascot/index.js';
import '../plugins/layer/host-cyber-bust/index.js';
import '../plugins/beat/metric-compare/index.js';
import '../plugins/layer/halftone-dots/index.js';
import '../lib/stage/host.js';
import '../lib/stage/index.js';

const {
  HOST_VARIANTS,
  MOUTH_SHAPES,
  computeContentRect,
  sampleMouth,
  isBlinking,
  resolveHostState,
  drawHost
} = globalThis.VBC_HOST;
const {
  createStage,
  activeBeatAt,
  activeCaptionAt
} = globalThis.VBC_STAGE;

function makeMockCanvas(width = 1920, height = 1080) {
  const ops = [];
  const ctx = {
    canvas: { width, height },
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    font: '16px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save() {
      ops.push('save');
    },
    restore() {
      ops.push('restore');
    },
    setTransform() {},
    translate(x, y) {
      ops.push(`translate:${x.toFixed(1)},${y.toFixed(1)}`);
    },
    scale(x, y) {
      ops.push(`scale:${x.toFixed(2)},${y.toFixed(2)}`);
    },
    rotate(a) {
      ops.push(`rotate:${a.toFixed(2)}`);
    },
    beginPath() {},
    closePath() {},
    moveTo(x, y) {
      ops.push(`move:${Math.round(x)},${Math.round(y)}`);
    },
    lineTo(x, y) {
      ops.push(`line:${Math.round(x)},${Math.round(y)}`);
    },
    quadraticCurveTo() {},
    arc(x, y, r) {
      ops.push(`arc:${Math.round(x)},${Math.round(y)},${Math.round(r)}`);
    },
    ellipse() {},
    rect(x, y, w, h) {
      ops.push(
        `rect:${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      );
    },
    roundRect(x, y, w, h) {
      ops.push(
        `rrect:${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      );
    },
    clip() {
      ops.push('clip');
    },
    fill() {
      ops.push(`fill:${this.fillStyle}`);
    },
    stroke() {
      ops.push(`stroke:${this.strokeStyle}`);
    },
    fillRect(x, y, w, h) {
      ops.push(
        `frect:${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      );
    },
    strokeRect(x, y, w, h) {
      ops.push(
        `srect:${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      );
    },
    fillText(text, x, y) {
      ops.push(`text:${text}@${Math.round(x)},${Math.round(y)}`);
    },
    measureText(str) {
      return {
        width: String(str).length * 14,
        actualBoundingBoxAscent: 24,
        actualBoundingBoxDescent: 6
      };
    }
  };
  return {
    width,
    height,
    ops,
    getContext() {
      return ctx;
    }
  };
}

test('host mouth sampler, seeded blinks, pose/side transitions and scale 35-45%', () => {
  const mouth = {
    fps: 12,
    shapes: 'cmaoe',
    level_fps: 30,
    level: [0.02, 0.35, 0.85, 0.6, 0.9]
  };
  for (let i = 0; i < MOUTH_SHAPES.length; i += 1) {
    const sample = sampleMouth(mouth, (i + 0.1) / 12);
    assert.equal(sample.shape, MOUTH_SHAPES[i]);
  }
  assert.equal(isBlinking(1.23, 'seed-a'), isBlinking(1.23, 'seed-a'));

  const layout = computeContentRect(1920, 1080, 'left', true);
  const ratio = layout.hostBox.height / 1080;
  assert.ok(ratio >= 0.35 && ratio <= 0.45, `host ratio ${ratio}`);

  const beats = [
    {
      id: 'b1',
      type: 'list',
      start: 0,
      end: 4,
      content: { side: 'left', mood: 'excited' }
    },
    {
      id: 'b2',
      type: 'big',
      start: 4,
      end: 8,
      content: { side: 'right', mood: 'focused' }
    }
  ];
  const startState = resolveHostState(beats, 0.2);
  assert.equal(startState.side, 'left');
  assert.equal(startState.pose, 'present');
  assert.equal(startState.mood, 'excited');

  const idleState = resolveHostState(beats, 2.5);
  assert.equal(idleState.pose, 'idle');

  const midDissolveOut = resolveHostState(beats, 4.08);
  assert.equal(midDissolveOut.side, 'left');
  assert.ok(midDissolveOut.dissolve < 1 && midDissolveOut.dissolve > 0);

  const midDissolveIn = resolveHostState(beats, 4.42);
  assert.equal(midDissolveIn.side, 'right');
  assert.ok(midDissolveIn.dissolve < 1 && midDissolveIn.dissolve > 0);
});

test('all 4 host plugins draw deterministically and have distinct silhouettes', () => {
  assert.equal(HOST_VARIANTS.length, 4);
  const signatures = new Set();
  for (const variant of HOST_VARIANTS) {
    const c1 = makeMockCanvas();
    const c2 = makeMockCanvas();
    const layout = computeContentRect(1920, 1080, 'left', true);
    const mouth = { fps: 12, shapes: 'cmaoeccmaoe' };
    drawHost(c1.getContext(), {
      variant,
      box: layout.hostBox,
      t: 0.35,
      mouth,
      mood: 'excited',
      pose: 'point',
      side: 'left',
      dissolve: 0.7
    });
    drawHost(c2.getContext(), {
      variant,
      box: layout.hostBox,
      t: 0.8,
      mouth,
      mood: 'neutral',
      pose: 'idle',
      side: 'right',
      dissolve: 1
    });
    c2.ops.length = 0;
    drawHost(c2.getContext(), {
      variant,
      box: layout.hostBox,
      t: 0.35,
      mouth,
      mood: 'excited',
      pose: 'point',
      side: 'left',
      dissolve: 0.7
    });
    assert.deepEqual(c1.ops, c2.ops, variant);
    signatures.add(c1.ops.slice(0, 40).join('|'));
  }
  assert.equal(signatures.size, 4);
});

test('createStage renders core and plugin beats with >=56px titles and >=34px body', () => {
  const bundle = {
    schemaVersion: 1,
    duration: 8,
    fps: 30,
    width: 1920,
    height: 1080,
    look: {
      id: 'pilot',
      resolved: {
        palette: 'studio-dark',
        marks: 'halftone-dots',
        hostVariant: 'pixel-sprite',
        showHost: true
      }
    },
    beats: [
      {
        id: 'intro',
        type: 'list',
        start: 0,
        end: 4,
        content: {
          kicker: 'HTTP/2 TCP Multiplexing',
          title: 'Single Lost Packet Stalls All Lanes',
          subtitle: 'Kernel buffer holds streams 2 and 3 behind #42',
          items: [
            'Stream 1: Packet #42 dropped in transit',
            'Stream 2: Ready in memory, blocked by OS',
            'Stream 3: Ready in memory, blocked by OS'
          ],
          side: 'left',
          mood: 'focused'
        }
      },
      {
        id: 'compare',
        type: 'metric-compare',
        start: 4,
        end: 8,
        title: 'TCP Stall vs QUIC Stream Isolation',
        badge: 'BENCHMARK @ 2% LOSS',
        side: 'right',
        mood: 'excited'
      }
    ],
    mouth: { fps: 12, shapes: 'cmaoe'.repeat(20) },
    captions: [
      {
        text: 'One dropped TCP segment freezes every multiplexed HTTP/2 stream.',
        start: 0.2,
        end: 3.8
      }
    ]
  };
  const canvas = makeMockCanvas(1920, 1080);
  const stage = createStage({ canvas, bundle });
  assert.equal(activeBeatAt(bundle.beats, 1.0).id, 'intro');
  assert.equal(activeCaptionAt(bundle.captions, 1.0).text, bundle.captions[0].text);

  for (const t of [1.5, 5.5]) {
    const bounds = stage.renderFrame(t);
    assert.ok(bounds.length >= 3);
    for (const b of bounds) {
      assert.ok(b.left >= 60 && b.right <= 1860, `horiz ${JSON.stringify(b)}`);
      assert.ok(b.top >= 60 && b.bottom <= 1020, `vert ${JSON.stringify(b)}`);
      if (b.role === 'title') {
        assert.ok(b.fontSize >= 56, `title fontSize ${b.fontSize}`);
      } else {
        assert.ok(b.fontSize >= 34, `body fontSize ${b.fontSize}`);
      }
    }
  }
  stage.dispose();
  assert.throws(() => stage.renderFrame(1.5), /disposed/);
});
