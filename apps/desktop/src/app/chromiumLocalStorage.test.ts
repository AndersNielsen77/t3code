import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { readChromiumLocalStorage } from "./chromiumLocalStorage.ts";

const FIXTURE = new URL("./__fixtures__/v1-local-storage", import.meta.url).pathname;

it.layer(NodeServices.layer)("readChromiumLocalStorage", (it) => {
  it.effect("reads live values from tables and the log, honoring deletes and overwrites", () =>
    Effect.gen(function* () {
      const items = yield* readChromiumLocalStorage(FIXTURE, "t3code://app");

      assert.deepStrictEqual([...items.keys()].sort(), [
        "latin1",
        "t3code:composer-drafts:v1",
        "t3code:prompt-stash:v2",
        "t3code:theme",
      ]);
      assert.equal(items.get("t3code:theme"), "light");
      assert.equal(items.get("latin1"), "café \u0085");
      // UTF-16 strings survive intact; Chromium stores non-Latin-1 text that way.
      assert.include(items.get("t3code:prompt-stash:v2"), '"prompt":"héllo 🌍 from V1"');
      assert.include(items.get("t3code:composer-drafts:v1"), '"prompt":"draft from V1"');
    }),
  );

  it.effect("returns nothing for another origin", () =>
    Effect.gen(function* () {
      const items = yield* readChromiumLocalStorage(FIXTURE, "t3code-dev://app");
      assert.equal(items.size, 0);
    }),
  );

  it.effect("fails on a truncated table instead of returning partial data", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-chromium-ls-" });
      for (const name of yield* fs.readDirectory(FIXTURE)) {
        yield* fs.copyFile(path.join(FIXTURE, name), path.join(directory, name));
      }
      const table = yield* fs.readFile(path.join(directory, "000003.ldb"));
      yield* fs.writeFile(path.join(directory, "000003.ldb"), table.subarray(0, 4096));

      const error = yield* readChromiumLocalStorage(directory, "t3code://app").pipe(Effect.flip);
      assert.equal(error._tag, "ChromiumLocalStorageReadError");
    }),
  );
});
