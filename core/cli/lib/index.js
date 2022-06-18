'use strict';

module.exports = core;

const pkg =require('../package.json')

function core() {
  checkCliVersion()
}
//检查最低node版本号
function checkNodeVersion() {
    // TODO
}
//检查脚手架版本号是否为最新
function checkCliVersion() {
  console.log(pkg.version);
    // TODO
}
//检查用户权限

function checkRoot() {
    // TODO
}
//检查用户主目录
function checkUserHome() {
    // TODO
}
//检查命令参数
function checkInputArgs() {
    // TODO
}
//检查用户主目录
function checkEnv() {
    // TODO
}