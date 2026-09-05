/* tslint:disable */
/* eslint-disable */

export class BrowserGame {
    free(): void;
    [Symbol.dispose](): void;
    audio(): Float32Array;
    constructor(coop: boolean, seed: number);
    pixels(): Uint8Array;
    /**
     * Only public HUD/session values, never actor or ghost internals.
     */
    status(): string;
    step(p1: number, p2: number, audio: boolean): void;
}

export class PixelPolicy {
    free(): void;
    [Symbol.dispose](): void;
    act(pixels: Uint8Array, frame: number, player: number): number;
    constructor(caution: number, exploration: number, chase_range: number);
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_browsergame_free: (a: number, b: number) => void;
    readonly __wbg_pixelpolicy_free: (a: number, b: number) => void;
    readonly browsergame_audio: (a: number) => [number, number];
    readonly browsergame_new: (a: number, b: number) => number;
    readonly browsergame_pixels: (a: number) => [number, number];
    readonly browsergame_status: (a: number) => [number, number];
    readonly browsergame_step: (a: number, b: number, c: number, d: number) => void;
    readonly pixelpolicy_act: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly pixelpolicy_new: (a: number, b: number, c: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
