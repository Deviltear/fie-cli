'use strict';
const nlog = require('@fie-cli/nlog')
const path = require('path')
const Package = require('@fie-cli/package')
const SETTINGS = {
    init: '@fie-cli/init'
}
const CACHE_DIRECTORY = 'dependencies'
function exec() {
    // process.env._CLI_TARGET_PATH,process.env._CLI_HOME_PATH 是core/cli 里面定义的全局环境变量
    let targetPath = process.env._CLI_TARGET_PATH
    const homePath = process.env._CLI_HOME_PATH
    nlog.verbose(targetPath, homePath)
    const cmdObj = arguments[arguments.length - 1]
    const packageName = SETTINGS[cmdObj.name()]
    let storePath = ''
    const packageVersion = 'latest'
    let pkg = new Package(
        {
            targetPath,
            packageName,
            packageVersion
        }
    )
    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIRECTORY)
        //生成package的缓存路径
        storePath = path.resolve(targetPath, 'node_modules')
        pkg = new Package(
            {
                targetPath,
                storePath,
                packageName,
                packageVersion
            }
        )
        if (pkg.exists()) {
            //更新package
            pkg.update()
        } else {
            //安装package
            pkg.install()
        }

    }
    const rootFile =pkg.getEntryFilePath()

    require(rootFile).apply(null,arguments)


}
module.exports = { exec };
