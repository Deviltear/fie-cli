'use strict';
const nlog = require('@fie-cli/nlog')

const Package = require('@fie-cli/package')
const SETTINGS = {
    init: '@fie-cli/init'
}
function exec() {
    // process.env._CLI_TARGET_PATH,process.env._CLI_HOME_PATH 是core/cli 里面定义的全局环境变量
    const targetPath = process.env._CLI_TARGET_PATH
    const homePath = process.env._CLI_HOME_PATH
    nlog.verbose(targetPath, homePath)
    const cmdObj = arguments[arguments.length - 1]
    const packageName = SETTINGS[cmdObj.name()]
    const packageVersion = 'latest'


    const pkg = new Package(
        {
            targetPath,
            packageName,
            packageVersion
        }
    )
}
module.exports = { exec };
