'use strict';

module.exports = core;
const semver = require('semver') //比对2个版本是否一致的库
const colors = require('colors') //改变字符串颜色
const userHome = require('user-home');
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json')
const nlog = require("@fie-cli/nlog")
const { LOWEST_NODE_VERSION,DEFAULT_CLI_HOME } = require("./constant")
let args, config;
function core() {
  try {
    checkCliVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    checkEnv()
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
//检查脚手架版本号是否为最新
function checkCliVersion() {
  nlog.info(pkg.version);
  // TODO
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
  process.env.CLI_HOME_PATH=cliConfig.cliHome
  return cliConfig;
}
function checkEnv() {
  nlog.verbose('开始检查环境变量');
  const dotenv = require('dotenv');
  dotenv.config({
    path: path.resolve(userHome, '.env'),
  });
  config = createCliConfig(); // 准备基础配置
  nlog.verbose('环境变量', config);
}