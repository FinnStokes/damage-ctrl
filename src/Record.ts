import * as _R from "fp-ts/lib/Record.js";

export const toArray = _R.toArray as <K extends string | number | symbol, V>(record: Record<K, V>) => [K, V][];
export const map = _R.map as <K extends string | number | symbol, A, B>(f: (a: A) => B) => (record: Record<K, A>) => Record<K, B>;
