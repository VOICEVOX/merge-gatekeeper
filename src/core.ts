import type * as webhooks from "@octokit/webhooks-types";

export type ScoreRule = {
  target: "team" | "user";
  slug: string;
  users: string[];
  score: number;
};
export type GitHubEvent =
  | webhooks.PullRequestAutoMergeEnabledEvent
  | webhooks.MergeGroupChecksRequestedEvent;

export const getRepository = (event: GitHubEvent, ref: string) => {
  const owner = event.repository.owner.login;
  const repo = event.repository.name;

  let prNumber: number;

  if (event.action === "auto_merge_enabled") {
    prNumber = event.pull_request.number;
  } else if (event.action === "checks_requested") {
    // `refs/heads/gh-readonly-queue/main/pr-9-585e0bea0e4a1d10ce8ba48e5a6fa9615ee6553e`
    const prNumberString = ref.match(/pr-(\d+)-/)?.[1];
    if (!prNumberString) {
      throw new Error("PR number not found");
    }

    prNumber = Number.parseInt(prNumberString);
  } else {
    throw new Error("Unsupported action");
  }

  return { owner, repo, prNumber };
};

export const checkReview = async (
  rules: ScoreRule[],
  approvedUsers: Set<string>,
) => {
  const scores: {
    user: string;
    score: number;
  }[] = [];

  for (const user of approvedUsers) {
    const userRule = rules.find(
      (rule) => rule.target === "user" && rule.users.includes(user),
    );

    if (userRule) {
      scores.push({ user: user, score: userRule.score });
      continue;
    }

    const teamRule = rules.find(
      (rule) => rule.target === "team" && rule.users.includes(user),
    );

    if (teamRule) {
      scores.push({ user, score: teamRule.score });
    }
  }

  return scores;
};
