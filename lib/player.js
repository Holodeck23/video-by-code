// player.js: optional preview bar for a kit page. Include it after the page script or before; it waits
// for window.__ready. With ?export=1 on the URL (the renderer always adds it) this file does nothing.
// Controls: play/pause, scrub, time, sound on/off, loop. Keys: space = play/pause, arrows = one frame.
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('export') === '1') return;

  const css = `
  .vbc-bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:12px;padding:10px 16px;
    background:rgba(18,18,20,.88);color:#eee;font:13px/1.2 -apple-system,system-ui,sans-serif;z-index:9999;
    backdrop-filter:blur(6px)}
  .vbc-bar button{background:#2c2c30;color:#eee;border:1px solid #444;border-radius:6px;padding:6px 10px;
    font:inherit;cursor:pointer;min-width:64px}
  .vbc-bar button[aria-pressed=true]{background:#3d5a80;border-color:#5b7fb0}
  .vbc-bar input[type=range]{flex:1;min-width:80px;accent-color:#7fa7e0}
  .vbc-time{font-variant-numeric:tabular-nums;min-width:120px;text-align:right}
  .vbc-fit{max-width:100vw;max-height:calc(100vh - 56px);width:auto!important;height:auto!important;
    display:block;margin:0 auto}`;

  function boot() {
    const canvas = document.getElementById('c');
    if (!canvas || typeof window.__renderFrame !== 'function') return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    canvas.classList.add('vbc-fit');

    const bar = document.createElement('div');
    bar.className = 'vbc-bar';
    bar.innerHTML = `<button data-k="play">Play</button>
      <input data-k="scrub" type="range" min="0" step="0.001" value="0" aria-label="time">
      <span class="vbc-time" data-k="time"></span>
      <button data-k="sound" aria-pressed="true">Sound</button>
      <button data-k="loop" aria-pressed="false">Loop</button>`;
    document.body.appendChild(bar);
    const el = (k) => bar.querySelector(`[data-k=${k}]`);
    const playBtn = el('play'), scrub = el('scrub'), timeEl = el('time'), soundBtn = el('sound'), loopBtn = el('loop');

    const dur = () => Number(window.DURATION) || 0;
    const fps = () => Number(window.FPS) || 30;
    scrub.max = String(dur());
    let t = 0, playing = false, startWall = 0, startT = 0, stopSound = null, raf = 0;

    function draw(at) {
      t = Math.min(Math.max(at, 0), dur());
      window.__renderFrame(t);
      scrub.value = String(t);
      timeEl.textContent = `${t.toFixed(2)} / ${dur().toFixed(2)} s`;
    }
    function soundOn() { return soundBtn.getAttribute('aria-pressed') === 'true'; }
    function startSound() {
      stopAudio();
      if (soundOn() && window.SOUND && typeof window.scoreSound === 'function') {
        stopSound = window.SOUND.live(window.scoreSound, t);
      }
    }
    function stopAudio() { if (stopSound) { stopSound(); stopSound = null; } }
    // While sound plays, the audio clock leads; otherwise the wall clock does.
    function now() {
      if (stopSound && stopSound.ctx && stopSound.ctx.state === 'running') return Math.max(startT, stopSound.time());
      return startT + (performance.now() - startWall) / 1000;
    }
    function tick() {
      if (!playing) return;
      let at = now();
      if (at >= dur()) {
        if (loopBtn.getAttribute('aria-pressed') === 'true') { draw(0); begin(); return; }
        draw(dur()); pause(); return;
      }
      draw(at);
      raf = requestAnimationFrame(tick);
    }
    function begin() {
      startT = t; startWall = performance.now();
      startSound();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }
    function play() {
      if (t >= dur() - 1e-3) draw(0);
      playing = true; playBtn.textContent = 'Pause';
      begin();
    }
    function pause() {
      playing = false; playBtn.textContent = 'Play';
      cancelAnimationFrame(raf); stopAudio();
    }
    const toggle = (btn) => btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));

    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    scrub.addEventListener('input', () => { draw(Number(scrub.value)); if (playing) begin(); });
    soundBtn.addEventListener('click', () => { toggle(soundBtn); if (playing) begin(); });
    loopBtn.addEventListener('click', () => toggle(loopBtn));
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = (e.code === 'ArrowRight' ? 1 : -1) / fps();
        draw(Math.round((t + step) * fps()) / fps());
        if (playing) begin();
      }
    });
    draw(0);
  }

  const start = () => Promise.resolve(window.__ready).then(boot, (e) => console.error('player: __ready failed', e));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
