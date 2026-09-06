/**
 * Canonical digest of simulation state.
 *
 * "Byte-identical run" is a claim about this function. Two runs agree if their digests
 * agree at every checkpoint tick, not merely at the end, so a divergence is caught at the
 * tick it happens rather than a simulated year later.
 *
 * FNV-1a over the raw bytes, run as two independent 32-bit lanes with different offset
 * bases and combined into a 64-bit hex string. Not a cryptographic hash and not intended
 * to be; it needs to be fast, dependency-free and exactly reproducible, and 32-bit
 * integer arithmetic in JavaScript is all three.
 */

const FNV_OFFSET_A = 0x811c9dc5
const FNV_OFFSET_B = 0x01000193
const FNV_PRIME = 0x01000193

export class StateHasher {
  private a = FNV_OFFSET_A
  private b = FNV_OFFSET_B

  /**
   * Absorbs a typed array by its raw bytes. Float bit patterns are hashed directly rather
   * than through any decimal formatting, so -0 and 0 are distinguished and no rounding
   * enters the digest.
   */
  absorb(view: ArrayBufferView): this {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    for (let i = 0; i < bytes.length; i += 1) {
      const byte = bytes[i]!
      this.a = Math.imul(this.a ^ byte, FNV_PRIME) >>> 0
      this.b = Math.imul(this.b ^ (byte + i), FNV_PRIME) >>> 0
    }
    return this
  }

  /** Absorbs a single integer, so that scalars enter the digest as unambiguously as arrays. */
  absorbInt(value: number): this {
    return this.absorb(Uint32Array.of(value >>> 0))
  }

  /** Absorbs a float by its exact bit pattern. */
  absorbFloat(value: number): this {
    return this.absorb(Float64Array.of(value))
  }

  /** 64 bits as 16 lowercase hex characters. */
  digest(): string {
    return hex32(this.a) + hex32(this.b)
  }
}

function hex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0')
}

/** Convenience for the common case of digesting a fixed list of buffers. */
export function hashBuffers(views: readonly ArrayBufferView[]): string {
  const hasher = new StateHasher()
  for (const view of views) hasher.absorb(view)
  return hasher.digest()
}
