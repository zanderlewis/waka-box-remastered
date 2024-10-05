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

// Set Global Variables
let range = RANGE.LAST_7_DAYS;
let gistText = "";
let bar = "_=";

// Set Gist Text
if (range == RANGE.LAST_7_DAYS) {
  gistText = "📊 Weekly development breakdown";
} else if (range == RANGE.LAST_30_DAYS) {
  gistText = "📊 Monthly development breakdown";
} else if (range == RANGE.LAST_6_MONTHS) {
  gistText = "📊 Bi-Yearly development breakdown";
} else if (range == RANGE.LAST_YEAR) {
  gistText = "📊 Yearly development breakdown";
}

// Supported Ranges: LAST_7_DAYS, LAST_30_DAYS, LAST_6_MONTHS, LAST_YEAR
async function main() {
  const stats = await wakatime.getMyStats({ range: range });
  await updateGist(stats);
}

function trimRightStr(str, len) {
  // Ellipsis takes 3 positions, so the index of substring is 0 to total length - 3.
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
}

async function updateGist(stats) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];
  for (let i = 0; i < Math.min(stats.data.languages.length, 5); i++) {
    const data = stats.data.languages[i];
    const { name, percent, text: time } = data;

    const line = [
      trimRightStr(name, 10).padEnd(10),
      time.padEnd(14),
      generateBarChart(percent, 21),
      String(percent.toFixed(1)).padStart(5) + "%"
    ];

    lines.push(line.join(" "));
  }

  if (lines.length == 0) return;

  try {
    // Get original filename to update that same file
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: gistText,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent, size) {
  const syms = bar;

  const frac = Math.floor((size * bar.length * percent) / 100);
  const barsFull = Math.floor(frac / bar.length);
  if (barsFull >= size) {
    return syms.substring(bar.length - 1, bar.length).repeat(size);
  }
  const semi = frac % bar.length;

  return [
    syms.substring(bar.length - 1, bar.length).repeat(barsFull),
    syms.substring(semi, semi + 1)
  ]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

(async () => {
  await main();
})();
