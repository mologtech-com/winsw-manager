const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { program } = require("commander");
const execa = require("execa");

const CWD = _.get(process, 'pkg.entrypoint') ? path.dirname(process.execPath) : process.cwd();

const cf = JSON.parse(fs.readFileSync(path.join(CWD, 'config.json'), { encoding: 'utf8' }));

const delay = (ms) => new Promise((r) => setTimeout(() => r(), ms));

function wrapError(error) {
  console.log(error.message);
  process.exit(1);
}

function getFileFromName(name) {
  const x = _.find(cf.winsw, (v) => v.name === name);
  if (!x) {
    throw new Error("Cannot find service: " + name);
  }
  return x.file;
}

async function execCommandAsync(cmd, args, options) {
  const { stdout } = await execa(cmd, args, options);
  return stdout;
}

async function startServiceAsync(name) {
  const filePath = getFileFromName(name);
  const p = path.parse(filePath);
  process.chdir(p.dir);
  return await execCommandAsync(p.base, ["start"]);
}

async function stopServiceAsync(name) {
  const filePath = getFileFromName(name);
  const p = path.parse(filePath);
  process.chdir(p.dir);
  const result = await execCommandAsync(p.base, ["stop"]);
  let startTime = new Date().getTime();
  let curTime = new Date().getTime();
  while(curTime <= (startTime + 5000)) {
    const out =  await execCommandAsync(p.base, ["status"]);
    if (out.indexOf('Stopped') !== -1) {
        break;
    }
    await delay(1000);
    curTime = new Date().getTime();
  }
  return result;
}

program
  .name("winsw-manager.exe")
  .description("Makes it easier to manage such winsw services")
  .version("1.0.0");

program
  .command("start <name>")
  .description("start named service")
  .action(async (name) => {
    try {
      const result = await startServiceAsync(name);
      console.log(result);
      process.exit(0);
    } catch (error) {
      wrapError(error);
    }
  });

program
  .command("stop <name>")
  .description("stop named service")
  .action(async (name) => {
    try {
        const result = await stopServiceAsync(name);
        console.log(result);
        process.exit(0);
    } catch (error) {
      wrapError(error);
    }
  });

program.parse(process.argv);
