'use strict';
const nlog = require("@fie-cli/nlog");
const Command = require("@fie-cli/command");
const fse = require("fs-extra");
const path = require('path')
const fs = require('fs')


class PulishCommand extends Command {
    init() {
        nlog.verbose(this._argv) //调试信息
    }

    async exec() {
        try {
            const startTime = new Date().getTime()
            this.prepare()
            const endTime = new Date().getTime()
            nlog.info(`本次发布耗时: ${Math.floor(endTime - startTime) / 1000} 秒`)

        } catch (e) {
            nlog.error(e.message)
        }
    }

    prepare() {
        const projectPath = process.cwd()
        const pkgPath = path.resolve(projectPath, 'package.json')
        nlog.verbose('pkgPath', pkgPath)
        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json 不存在')
        }
        const pkginfo = fse.readJSONSync(pkgPath)
        const { name, version, scripts } = pkginfo
        if (!name || !version || !scripts || !scripts.build) {
            throw new Error("package.json 信息不全,请检查是否存在name,version,scripts (需提供build命令)")
        }
        this.projectInfo = {
            name,
            version,
            dir: projectPath
        }
    }

}
function init(argv) {
    return new PulishCommand(argv)
}
module.exports = init;
module.exports.PulishCommand = PulishCommand;

