import * as assert from "node:assert";
import child_process from "node:child_process";
import test from "node:test";

test("マージキューだけ落ちるテスト", async () => {
  const stdout = child_process
    .execSync("git branch --show-current")
    .toString()
    .trim();

  assert.ok(!stdout.includes("gh-readonly-queue"));
});
