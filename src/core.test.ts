import * as assert from "node:assert";
import fs from "node:fs/promises";
import test from "node:test";
import * as core from "./core.ts";

test("Can get repository: auto_merge_enabled", async () => {
  const event = await fs
    .readFile(`${import.meta.dirname}/events/autoMergeEnabled.json`, "utf8")
    .then((data) => JSON.parse(data));
  const repository = core.getRepository(event, "refs/heads/main");
  assert.deepStrictEqual(repository, {
    owner: "nanatsuki-testing",
    repo: "merge-queue",
    prNumber: 8,
  });
});

test("Can get repository: checks_requested", async () => {
  const event = await fs
    .readFile(`${import.meta.dirname}/events/checksRequested.json`, "utf8")
    .then((data) => JSON.parse(data));
  const repository = core.getRepository(
    event,
    "refs/heads/gh-readonly-queue/main/pr-8-c3594e4d5fb79ddc7e171d4ca90f78e5fb836183",
  );
  assert.deepStrictEqual(repository, {
    owner: "nanatsuki-testing",
    repo: "merge-queue",
    prNumber: 8,
  });
});

test("Can count scores", async () => {
  const rules: core.ScoreRule[] = [
    {
      target: "user",
      slug: "sevenc-nanashi",
      users: ["sevenc-nanashi"],
      score: 1,
    },
    {
      target: "team",
      slug: "reviewers",
      users: ["octocat", "sevenc-nanashi"],
      score: 2,
    },
  ];
  const scores = await core.checkReview(
    rules,
    new Set(["sevenc-nanashi", "octocat", "github-actions"]),
  );
  assert.deepStrictEqual(scores, [
    { user: "sevenc-nanashi", score: 1 },
    { user: "octocat", score: 2 },
  ]);
});
