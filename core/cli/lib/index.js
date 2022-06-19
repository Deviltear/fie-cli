'use strict';

module.exports = core;
const semver = require('semver') //比对2个版本是否一致的库
const colors = require('colors') //改变字符串颜色
const userHome = require('user-home') //改变字符串颜色
const pathExists = require('path-exists').pathExistsSync //改变字符串颜色
const pkg = require('../package.json')
const nlog = require("@fie-cli/nlog")
const { LOWEST_NODE_VERSION } = require("./constant")

function core() {
    try {
        checkCliVersion()
        checkNodeVersion()
        checkRoot()
        checkUserHome()
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
    const rootCheck=  require('root-check')
    rootCheck()
    // TODO
}
//检查用户主目录
function checkUserHome() {
    // TODO
    if (userHome||pathExists(userHome)) {
        throw new Error(colors.red('当前用户主目录不存在'))
    }

}
//检查命令参数
function checkInputArgs() {
    // TODO
}
//检查用户主目录
function checkEnv() {
    // TODO
}