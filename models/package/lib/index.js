'use strict';
const path = require('path')
const fs = require('fs')
const npmInstall = require('npminstall')
const fse = require('fs-extra')
const { isObject, getDefaultregistry } = require('@fie-cli/util')
const systemPathFormat = require('@fie-cli/system-path-format')
const { getNpmLatestVersion } = require('@fie-cli/get-npm-info')


const pkgDir = require('pkg-dir')
class Package {
    constructor(opt) {
        if (!opt) {
            throw new Error('Package 类的参数不能为空')
        }
        if (!isObject(opt)) {
            throw new Error('Package 类的参数不为对象')
        }
        //package的路径
        this.targetPath = opt.targetPath,
            //文件的缓存路径
            this.storeDir = opt.storePath,
            //package的名称
            this.packageName = opt.packageName,
            //package的版本
            this.packageVersion = opt.packageVersion,
            //缓存目录前缀
            this.cacheFilePathPrefix = this.packageName.replace('/', '_')
    }
    async prepare() {
        if (this.storeDir && !fs.existsSync(this.storeDir)) {
            fse.mkdirpSync(this.storeDir) //利用fs-extra 库 创建文件夹
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName)
        }
    }
    //获取一个缓存路径,class中的get方法可以直接重写
    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }

    //生成指定版本的缓存路径
    getSpecifyCacheFilePath(version) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${version}@${this.packageName}`)
    }
    //判断package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare()
            return fs.existsSync(this.cacheFilePath())
        } else {
            return fs.existsSync(this.targetPath)
        }
    }
    //安装package
    async install() {
        await npmInstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultregistry(),
            pkgs: [
                { name: this.packageName, version: this.packageVersion }
            ]
        })
    }
    //更新package
    async update() {
        await this.prepare()
        const latestPackageVersion = await getNpmLatestVersion(this.packageName)
        const latestVersionCacheFilePath = this.getSpecifyCacheFilePath(latestPackageVersion)

        if (fs.existsSync(latestVersionCacheFilePath)) {
            await npmInstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultregistry(),
                pkgs: [
                    { name: this.packageName, version: latestPackageVersion }
                ]
            })
            this.packageVersion = latestPackageVersion
        }
    }
    //获取入口文件路径
    getEntryFilePath() {
        //1.获取package.json 所在目录
        const dir = pkgDir.sync(this.targetPath)
        console.log(dir, 'ss');

        if (dir) {
            //2.读取package.json
            const pkgFilePath = require(path.resolve(dir, 'package.json'))
            //3.寻找main||lib
            if (pkgFilePath && pkgFilePath?.main) {
                //4路径兼容(macOs 和win)
                return systemPathFormat(path.resolve(dir, pkgFilePath.main))
            }
        }
        return null
    }
}
module.exports = Package;
