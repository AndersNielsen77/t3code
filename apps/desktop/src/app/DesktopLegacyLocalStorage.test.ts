import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as DesktopLegacyLocalStorage from "./DesktopLegacyLocalStorage.ts";

const FIXTURE = new URL("./__fixtures__/v1-local-storage", import.meta.url).pathname;

const setup = Effect.fn(function* (v1ProfileName: string | null) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const appData = yield* fs.makeTempDirectoryScoped({ prefix: "t3-legacy-ls-" });
  if (v1ProfileName !== null) {
    const leveldb = path.join(appData, v1ProfileName, "Local Storage", "leveldb");
    yield* fs.makeDirectory(leveldb, { recursive: true });
    for (const name of yield* fs.readDirectory(FIXTURE)) {
      yield* fs.copyFile(path.join(FIXTURE, name), path.join(leveldb, name));
    }
  }
  const userData = path.join(appData, "t3code-v2");
  yield* fs.makeDirectory(userData);
  const service = yield* DesktopLegacyLocalStorage.make.pipe(
    Effect.provideService(
      DesktopEnvironment.DesktopEnvironment,
      DesktopEnvironment.DesktopEnvironment.of({
        appDataDirectory: appData,
        isDevelopment: false,
      } as DesktopEnvironment.DesktopEnvironment["Service"]),
    ),
  );
  return { service, userData };
});

it.layer(NodeServices.layer)("DesktopLegacyLocalStorage", (it) => {
  it.effect("offers the V1 items once, then stops after the import completes", () =>
    Effect.gen(function* () {
      const { service, userData } = yield* setup("t3code");

      yield* service.load(userData);
      const pending = yield* service.pending;
      assert.equal(Option.getOrThrow(pending)["t3code:theme"], "light");

      yield* service.complete;
      assert.isTrue(Option.isNone(yield* service.pending));
      yield* service.load(userData);
      assert.isTrue(Option.isNone(yield* service.pending));
    }),
  );

  it.effect("reads the Alpha-era profile V1 used when that folder existed", () =>
    Effect.gen(function* () {
      const { service, userData } = yield* setup("T3 Code (Alpha)");
      yield* service.load(userData);
      assert.isTrue(Option.isSome(yield* service.pending));
    }),
  );

  it.effect("offers again on the next launch when the window never completed it", () =>
    Effect.gen(function* () {
      const { service, userData } = yield* setup("t3code");
      yield* service.load(userData);
      yield* service.load(userData);
      assert.isTrue(Option.isSome(yield* service.pending));
    }),
  );

  it.effect("records a fresh install as done", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { service, userData } = yield* setup(null);
      yield* service.load(userData);
      assert.isTrue(Option.isNone(yield* service.pending));
      assert.deepStrictEqual(yield* fs.readDirectory(userData), ["v1-local-storage-imported"]);
    }),
  );
});
