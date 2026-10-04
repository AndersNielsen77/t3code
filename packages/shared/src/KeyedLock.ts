import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as RcMap from "effect/RcMap";
import * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";

export interface KeyedLock<Key> {
  /** Runs `effect` once no other holder of `key` is running, in arrival order. */
  readonly withLock: <A, E, R>(key: Key, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** The keys someone holds or waits on right now. */
  readonly activeKeys: Effect.Effect<ReadonlyArray<Key>>;
}

/**
 * Mutual exclusion per key. A key's lock exists only while someone holds or
 * waits on it, so locks for keys that come and go never accumulate. Not
 * reentrant: taking a key while already holding it deadlocks.
 *
 * Keys compare by `Equal` (by value for strings and numbers). The lock lives as
 * long as the scope it is made in; after that scope closes, `withLock`
 * interrupts.
 */
export const make = <Key>(): Effect.Effect<KeyedLock<Key>, never, Scope.Scope> =>
  Effect.map(RcMap.make({ lookup: (_key: Key) => Semaphore.make(1) }), (locks) => ({
    // The handle on the key's lock lives in its own scope, so `effect` still
    // runs in (and adds finalizers to) the caller's scope, not the lock's.
    withLock: (key, effect) =>
      Effect.acquireUseRelease(
        Scope.make(),
        (handle) =>
          RcMap.get(locks, key).pipe(
            Scope.provide(handle),
            Effect.flatMap((semaphore) => semaphore.withPermit(effect)),
          ),
        (handle) => Scope.close(handle, Exit.void),
      ),
    activeKeys: RcMap.keys(locks).pipe(Effect.map((keys) => Array.from(keys))),
  }));
