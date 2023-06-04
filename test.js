const { execSync } = require("node:child_process");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { expect } = require("expect");

async function run() {
  const testTmpDir = path.resolve(__dirname, "test-temp");

  await fs.rm(testTmpDir, { recursive: true, force: true });

  const suites = await fs.readdir(path.resolve(__dirname, "tests"));

  suites.forEach((suite) => {
    const suitePath = path.resolve(__dirname, "tests", suite);
    const configFile = path.join(suitePath, "babel.config.json");
    const output = path.join(testTmpDir, suite);

    execSync(
      `npx babel ${suitePath} --config-file ${configFile} --out-dir ${output} --extensions=".jsx,.tsx"`,
      { stdio: "inherit" }
    );

    const transpiledTemplateFunc =
      require(`./test-temp/${suite}/test.js`).default;

    const expectedHtmlFile = path.join(suitePath, "expected.html");
    const generatedHtml = transpiledTemplateFunc();
    const expectedGeneratedHtml = fsSync.readFileSync(expectedHtmlFile, {
      encoding: "utf8",
    });

    try {
      expect(generatedHtml).toEqual(expectedGeneratedHtml);
    } catch (e) {
      console.error(`Tests failed on suite "${suite}"`);

      throw e;
    }
  });

  console.log(`Successfully ran ${suites.length} test cases`);
}

run();
