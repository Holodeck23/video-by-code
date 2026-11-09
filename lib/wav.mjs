// Minimal WAV reader/writer for the voice stage. Mono Float32 in memory, PCM16 on disk.
// Reads PCM16/PCM24/float32 and folds multichannel to mono. No resampling: callers must agree on a rate.
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

/** Parses a RIFF/WAVE buffer into { samples: Float32Array (mono), rate }. */
export function decodeWav(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let fmt = null;
  let data = null;
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = buf.toString('latin1', at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === 'fmt ') {
      fmt = {
        tag: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        rate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(buf.length, body + size));
    }
    at = body + size + (size % 2);
  }
  if (!fmt || !data) {
    throw new Error('WAV is missing a fmt or data chunk');
  }
  const bytes = fmt.bits / 8;
  const frames = Math.floor(data.length / (bytes * fmt.channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c += 1) {
      const o = (i * fmt.channels + c) * bytes;
      if (fmt.tag === 3 && fmt.bits === 32) {
        sum += data.readFloatLE(o);
      } else if (fmt.tag === 1 && fmt.bits === 16) {
        sum += data.readInt16LE(o) / 32768;
      } else if (fmt.tag === 1 && fmt.bits === 24) {
        sum += data.readIntLE(o, 3) / 8388608;
      } else {
        throw new Error(`unsupported WAV encoding (tag ${fmt.tag}, ${fmt.bits}-bit)`);
      }
    }
    samples[i] = sum / fmt.channels;
  }
  return { samples, rate: fmt.rate };
}

/** Encodes mono Float32 samples as a 16-bit PCM WAV buffer. */
export function encodeWav(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v < 0 ? v * 32768 : v * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'latin1');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'latin1');
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

export async function readWav(path) {
  return decodeWav(await readFile(path));
}

/** Writes a WAV atomically (temporary file, then rename). */
export async function writeWav(path, samples, rate) {
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, encodeWav(samples, rate), { flag: 'wx' });
    await rename(tmp, path);
  } finally {
    await unlink(tmp).catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
  }
}
