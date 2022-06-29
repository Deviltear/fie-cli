'use strict';
const {isObject} = require('@fie-cli/util')

class Package {
    constructor(opt) {
        if (!opt) {
            throw new Error('Package 类的参数不能为空')
        }
        if (!isObject(opt)) {
            throw new Error('Package 类的参数不为对象')
        }
        //package的路径
        this.targetPath = opt.targetPath
        //package的缓存路径
        this.storePath = opt.storePath
        //package的名称
        this.packageName = opt.name
        //package的版本
        this.packageVersion = opt.version
    }
    //判断package是否存在
    exists() { }
    //安装package
    install() { }
    //更新package
    update() { }
    //获取入口文件路径
    getEntryFilePath() { }
}
module.exports = Package;
