"use strict";
const cp = require("child_process");
const nlog = require("@fie-cli/nlog");
const path = require("path");
const Package = require("@fie-cli/package");
const SETTINGS = {
  init: "@fie-cli/init",
  publish: "@fie-cli/publish",
  gitFlow: "@fie-cli/gitflow"

};
const CACHE_DIRECTORY = "dependencies";
async function basicExec() {
  // process.env._CLI_TARGET_PATH,process.env._CLI_HOME_PATH 是core/cli 里面定义的全局环境变量
  let targetPath = process.env._CLI_TARGET_PATH;
  const homePath = process.env._CLI_HOME_PATH;
  const cmdObj = arguments[arguments.length - 1];

  const packageName = SETTINGS[cmdObj.name()];
  let storePath, rootFile;
  const packageVersion = "latest";
  if (!targetPath) {

    targetPath = path.resolve(homePath, CACHE_DIRECTORY);
    //生成package的缓存路径
    storePath = path.resolve(targetPath, "node_modules");

    const initPkg = new Package({
      targetPath,
      storePath,
      packageName,
      packageVersion,
    });
    if (await initPkg.exists()) {
      //更新package
      nlog.info(`${packageName}可更新${packageVersion}`)
      // await initPkg.update();
    } else {
      //安装package
      await initPkg.install();

    }
    rootFile = initPkg.getEntryFilePath();

  } else {
    const execPkg = new Package({
      targetPath,
      storePath: targetPath,
      packageName,
      packageVersion,
    });
    rootFile = execPkg.getEntryFilePath();
  }

  if (rootFile) {
    try {
      const args = Array.from(arguments);

      const cmdObj = args[args.length - 1] || {};
      let obj = Object.create(null);

      Object.keys(cmdObj).forEach((key) => {
        if (
          cmdObj.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          obj[key] = cmdObj[key];
        }
      });
      args[args.length - 1] = obj;

      const code = `require("${rootFile}")(${JSON.stringify(args)})`;
      nlog.verbose(targetPath, homePath, args);

      const child = spawn("node", ["-e", code], {//利用spawn方式开启子进程
        cwd: process.cwd(),
        stdio: "inherit", //可以利用该方式将主进程的执行信息传入子进程,避免用stdot等监听
      });
      child.on("error", (e) => nlog.error(e.message));
      child.on("exit", (e) => process.exit(e));
    } catch (err) {
      nlog.error(err.message);
    }
  }
}
function spawn(command, args, options) { //兼容win 系统的情况,win 终端是cmd 命令
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return cp.spawn(cmd, cmdArgs, options);
}
module.exports = { basicExec };
