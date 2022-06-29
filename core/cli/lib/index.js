'use strict';

module.exports = core;
const semver = require('semver') //比对2个版本是否一致的库
const colors = require('colors') //改变字符串颜色
const userHome = require('user-home');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const pkg = require('../package.json')
const nlog = require("@fie-cli/nlog")
const { getNpmLatestSemverVersion } = require("@fie-cli/get-npm-info")
const { init } = require("@fie-cli/init")
const { exec } = require("@fie-cli/exec")


const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME, NPM_NAME } = require("./constant")
let args, config;
async function core() {
  try {
    await prepare()
    registerCommander()
  } catch (e) {
    nlog.error(e.message)
  }
}
//脚手架启动前置检查
async function prepare(params) {
  checkCliVersion() // 检查当前运行版本
  checkNodeVersion()// 检查 node 版本
  checkRoot() // 检查是否为 root 启动
  checkUserHome()  // 检查用户主目录
  checkEnv() // 检查环境变量
  //fixMe: 检查更新有bug,待修复
  // await checkGlobalCliUpdate() // 检查工具是否需要更新
}

function checkNodeVersion() {
  const currentVersion = process.version
  if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
    throw new Error(colors.red(`fie-cli 需要安装v${LOWEST_NODE_VERSION} 以上版本的node.js`))
  }
}
//注册命令
function registerCommander() {
  program
    .name(Object.keys(pkg?.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug, 是否开启调试模式', false)
    .option('-tp, --targetPath <char>', '是否指定本地调试文件目录', '/')
  program
    .command('init [projectName]')
    .option('-f --force', '是否强制初始化项目')
    .action(exec)
  const options = program.opts()

  //对debug命令进行监听
  program.on('option:debug', function () {
    if (options.debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    nlog.level = process.env.LOG_LEVEL;
  })
  program.on('option:targetPath', function () {
    process.env._CLI_TARGET_PATH = options.targetPath
  })
  //对未知命令进行监听
  program.on('command:*', function (obj) {
    const availableCommands = program.command.map(cwd => cwd.name())
    nlog.info(colors.red(`未知的命令: ${obj}`))
    if (availableCommands?.length) {
      nlog.info(colors.green(`可用命令: ${availableCommands.join(',')}`))
    }
    nlog.level = process.env.LOG_LEVEL;
  })
  if (process.args && process.args.length < 3) {
    program.outputHelp()
    console.log();//打印一行空方便分隔查看
  }
  program.parse(process.argv)
}
function checkCliVersion() {
  nlog.info(pkg.version);
}
//检查用户权限,并自动降级用户
function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}
function checkUserHome() {
  if (!userHome || !fs.existsSync(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在'))
  }

}

//生成默认的环境变量配置
function createCliConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
  }
  process.env._CLI_HOME_PATH = cliConfig.cliHome
  return cliConfig;
}
function checkEnv() {
  const dotenv = require('dotenv');
  dotenv.config({
    path: path.resolve(userHome, '.env'),
  });
  config = createCliConfig(); // 准备基础配置
}
//检查是否有最新版本脚手架,提示更新
async function checkGlobalCliUpdate() {
  const currentVersion = pkg.version
  const cliName = pkg.name
  const lastVersion = await getNpmLatestSemverVersion(NPM_NAME, currentVersion)
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    nlog.warn(colors.yellow(`有最新版本${cliName}, 当前版本${currentVersion},最新版本${lastVersion}
   更新命令: npm install -g ${cliName}
   `))

  }
}