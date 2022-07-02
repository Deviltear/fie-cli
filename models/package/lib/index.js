'use strict';
const path = require('path')
const npmInstall =require('npminstall')
const {isObject,getDefaultregistry} = require('@fie-cli/util')
const systemPathFormat = require('@fie-cli/system-path-format')

const pkgDir=require('pkg-dir').packageDirectorySync
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
        this.storeDir=opt.storePath,
        //package的名称
        this.packageName = opt.name
        //package的版本
        this.packageVersion = opt.version
    }
    //判断package是否存在
    exists() { }
    //安装package
    install() {
        npmInstall({
            root:this.targetPath,
            storeDir:this.storeDir,
            registry:getDefaultregistry(),
            pkgs:[
                {name:this.packageName,version:this.packageVersion}
            ]
        })
     }
    //更新package
    update() { }
    //获取入口文件路径
    getEntryFilePath() {
        //1.获取package.json 所在目录
        const dir= pkgDir(this.targetPath)
       if (dir) {
            //2.读取package.json
            const pkgFilePath =require(path.resolve(dir,'package.json'))
        //3.寻找main||lib
        if (pkgFilePath&&pkgFilePath?.main) {
        //4路径兼容(macOs 和win)
            return systemPathFormat(path.resolve(dir,pkgFilePathSystemPathCompatible.main))
        }
       }
       return null
    }
}
module.exports = Package;
