import { Chalk } from "chalk";
import * as actions from "@actions/core";
import type { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";
import * as core from "./core.ts";

const chalk = new Chalk({
  level: 3,
});

const ruleLinePattern = /^([@#][^:]+):(.+)$/;
type Team = Endpoints["GET /orgs/{org}/teams"]["response"]["data"][0];
const main = async () => {
  const token = actions.getInput("token", {
    required: true,
  });
  const event: core.GitHubEvent = JSON.parse(
    actions.getInput("event", {
      required: true,
    }),
  );
  const ref = actions.getInput("ref", {
    required: true,
  });
  const rulesRaw = actions.getInput("score_rules", {
    required: true,
  });
  const requiredScore = Number.parseInt(
    actions.getInput("required_score", {
      required: true,
    }),
  );
  if (Number.isNaN(requiredScore)) {
    throw new Error("Invalid required_score");
  }
  const onFail = actions.getInput("on_fail", {
    required: true,
  });
  if (!["fail", "none"].includes(onFail)) {
    throw new Error("Invalid on_fail");
  }

  const octokit = new Octokit({ auth: token });
  const rules: core.ScoreRule[] = [];
  let teams: Team[] | undefined;
  for (const rule of rulesRaw.split("\n")) {
    if (!(rule.startsWith("#") || rule.startsWith("@"))) {
      continue;
    }

    const match = rule.match(ruleLinePattern);
    if (!match) {
      throw new Error(`Invalid rule: ${rule}`);
    }

    const target = match[1][0] === "#" ? "team" : "user";
    const slug = match[1].slice(1).trim();
    const score = Number.parseInt(match[2].trim());
    if (Number.isNaN(score)) {
      throw new Error(`Invalid score: ${match[2]}`);
    }

    let users: string[];
    if (target === "team") {
      if (!event.organization) {
        throw new Error("This repository is not in an organization");
      }
      if (teams === undefined) {
        const { data } = await octokit.rest.teams.list({
          org: event.organization.login,
        });
        teams = data;
      }

      const team = teams.find((team) => team.slug === slug);
      if (!team) {
        throw new Error(`Team not found: ${slug}`);
      }

      const { data: members } = await octokit.rest.teams.listMembersInOrg({
        org: event.organization.login,
        team_slug: team.slug,
      });
      users = members.map((member) => member.login);
    } else {
      users = [slug];
    }

    rules.push({ target, slug, users, score });
  }

  if (rules.length === 0) {
    throw new Error("No rules found");
  }

  actions.info("Rules:");
  for (const rule of rules) {
    const left = `${rule.target === "team" ? "#" : "@"}${rule.slug}`;
    actions.info(
      `  ${chalk[rule.target === "team" ? "blue" : "green"](
        left,
      )}: ${rule.score}`,
    );
  }

  const { owner, repo, prNumber } = core.getRepository(event, ref);

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });
  const approvedUsers = new Set(
    reviews
      .filter((review) => review.state === "APPROVED")
      .map((review) => review.user?.login)
      .filter((login) => login != null),
  );
  approvedUsers.add(event.sender.login);
  actions.info("Approved users:");
  for (const user of approvedUsers) {
    actions.info(`  ${chalk.green(user)}`);
  }

  const scores = await core.checkReview(rules, approvedUsers);
  actions.info("Scores:");
  for (const { user, score } of scores) {
    actions.info(`  ${chalk.green(user)}: ${score}`);
  }

  const totalScore = scores.reduce((acc, { score }) => acc + score, 0);
  actions.setOutput("score", totalScore.toString());

  if (requiredScore === 0) {
    actions.info(`Total score: ${totalScore}`);

    actions.info("Skipping check");
    actions.setOutput("result", "true");
    return;
  }

  actions.info(`Total score: ${totalScore} / ${requiredScore}`);

  if (totalScore < requiredScore) {
    actions.setOutput("result", "false");
    actions.info(chalk.red("Failed"));
    if (onFail === "fail") {
      throw new Error("Not enough score");
    }
  } else {
    actions.setOutput("result", "true");
    actions.info(chalk.green("Passed"));
  }
};

main().catch((error) => {
  actions.setFailed(error.message);
  process.exit(1);
});
