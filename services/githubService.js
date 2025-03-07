const { Octokit } = require('@octokit/rest');

const GITHUB_TOKEN = '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';
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getGithubMetricsAuto(coinName, symbol) {
  try {
    const query = `${coinName} ${symbol} blockchain in:name,description`;
    const search = await octokit.search.repos({ q: query, sort: 'forks', order: 'desc', per_page: 1 });
    if (search.data.items.length === 0) return { Y: 0, C: 0, F: 0 };

    const repo = search.data.items[0];
    const owner = repo.owner.login;
    const repoName = repo.name;

    const commits = await octokit.repos.listCommits({ owner, repo: repoName });
    const contributors = await octokit.repos.listContributors({ owner, repo: repoName });

    return {
      Y: contributors.data.length,
      C: commits.data.length,
      F: repo.forks_count,
    };
  } catch (error) {
    console.error(`Error fetching GitHub metrics for ${coinName}:`, error.message);
    return { Y: 0, C: 0, F: 0 };
  }
}

module.exports = { getGithubMetricsAuto };