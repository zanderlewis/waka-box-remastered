require("dotenv").config();
const { WakaTimeClient, RANGE } = require("wakatime-client");
const { Octokit } = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  WAKATIME_API_KEY: wakatimeApiKey
} = process.env;

const wakatime = new WakaTimeClient(wakatimeApiKey);
const octokit = new Octokit({ auth: `token ${githubToken}` });

async function main() {
  try {
    const stats = await wakatime.getMyStats({ range: RANGE.LAST_30_DAYS });
    await updateGist(stats);
  } catch (error) {
    console.error(`Error fetching WakaTime stats: ${error}`);
  }
}

function trimRightStr(str, len) {
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
}

async function updateGist(stats) {
  try {
    const gist = await octokit.gists.get({ gist_id: gistId });
    const lines = generateGistContent(stats);

    if (lines.length > 0) {
      const filename = Object.keys(gist.data.files)[0];
      await octokit.gists.update({
        gist_id: gistId,
        files: {
          [filename]: {
            filename: `📊 Weekly development breakdown`,
            content: lines.join("\n")
          }
        }
      });
    }
  } catch (error) {
    console.error(`Unable to update gist: ${error}`);
  }
}

function generateGistContent(stats) {
  return stats.data.languages.slice(0, 5).map(data => {
    const { name, percent, text: time } = data;

    return [
      trimRightStr(name, 10).padEnd(10),
      time.padEnd(14),
      generateBarChart(percent, 21),
      `${percent.toFixed(1).padStart(5)}%`
    ].join(" ");
  });
}

function generateBarChart(percent, size) {
  const filledSize = Math.round((percent / 100) * size);
  const unfilledSize = size - filledSize;

  return "=".repeat(filledSize) + "_".repeat(unfilledSize);
}

(async () => {
  await main();
})();
