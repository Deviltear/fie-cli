'use strict';

module.exports = core;
const semver = require('semver') //比对2个版本是否一致的库
const colors = require('colors') //改变字符串颜色
const userHome = require('user-home');
const fs = require('fs');
const path = require('path');
const commander = require('commander')
const pkg = require('../package.json')
const nlog = require("@fie-cli/nlog")
const { getNpmLatestSemverVersion } = require("@fie-cli/get-npm-info")
const { init } = require("@fie-cli/init")


const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require("./constant")
let args, config;
const program= new commander.Command()
async function core() {
  try {
    checkCliVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    // checkInputArgs() 因为在commander注册命令时做了处理,这一步可以注释
    checkEnv()
    await checkGlobalCliUpdate()
    registerCommander()
  } catch (e) {
    nlog.error(e.message)
  }
}
//检查最低node版本号
function checkNodeVersion() {
  const currentVersion = process.version
  if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
    throw new Error(colors.red(`fie-cli 需要安装v${LOWEST_NODE_VERSION} 以上版本的node.js`))
  }
}
//注册命令
function registerCommander() {
  program
  .name(Object.keys(pkg?.bin[0]))
  .usage('<command> [options]')
  .version(pkg.version)
  .option('-d ,--debug, 是否开启调试模式',false)

  program
  .command('init [projectName]')
  .option('-f force', '是否强制初始化项目')
  .action(init(projectName,cmdObj))
  //对debug命令进行监听
  program.on('option:debug',function () {
    if (program.debug) {
      process.env.LOG_LEVEL = 'verbose';
    }else{
      process.env.LOG_LEVEL = 'info';
    }
    nlog.level = process.env.LOG_LEVEL;
  })
    //对debug命令进行监听
    program.on('command:*',function (obj) {
      const availableCommands = program.command.map(cwd=>cwd.name())
      nlog.info(colors.red(`未知的命令: ${obj}`))
      if (availableCommands?.length) {
        nlog.info(colors.green(`可用命令: ${availableCommands.join(',')}`))
      }
      nlog.level = process.env.LOG_LEVEL;
    })
    if (process.args&&process.args.length<3) {
      program.outputHelp()
      console.log();//打印一行空方便分隔查看
    }
  program.parse(process.argv)
}
//检查脚手架版本号是否为最新
function checkCliVersion() {
  nlog.info(pkg.version);
}
//检查用户权限,并自动降级用户
function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
  // TODO
}
//检查用户主目录
function checkUserHome() {
  if (!userHome || !fs.existsSync(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在'))
  }

}

function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose';
  } else {
    process.env.LOG_LEVEL = 'info';
  }
  nlog.level = process.env.LOG_LEVEL;
}
//检查命令参数
function checkInputArgs() {
  nlog.verbose('开始校验输入参数');
  const minimist = require('minimist');
  args = minimist(process.argv.slice(2)); // 解析查询参数
  checkArgs(args); // 校验参数
  nlog.verbose('输入参数', args);
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
  process.env.CLI_HOME_PATH = cliConfig.cliHome
  return cliConfig;
}
//检查环境变量
function checkEnv() {
  nlog.verbose('开始检查环境变量');
  const dotenv = require('dotenv');
  dotenv.config({
    path: path.resolve(userHome, '.env'),
  });
  config = createCliConfig(); // 准备基础配置
  nlog.verbose('环境变量', config);
}
//检查是否有最新版本脚手架,提示更新
async function checkGlobalCliUpdate() {
  const currentVersion = pkg.version
  const cliName = pkg.name
  const lastVersion = await getNpmLatestSemverVersion(cliName, 'url-join')
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    nlog.warn(colors.yellow(`有最新版本${cliName}, 当前版本${currentVersion},最新版本${lastVersion}
   更新命令: npm install -g ${cliName}
   `))

  }
}