'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')
const {getDefaultregistry} = require('@fie-cli/util')
function getNpmInfo(npmName, registry) {
    if (!npmName) {
        return null
    }
    const registryUrl = registry || getDefaultregistry()
    const npmInfoUrl = urlJoin(registryUrl, npmName)
    return axios.get(npmInfoUrl).then(res => {
        if (res?.status === 200) {
            return res.data
        } else {
            return null
        }
    }).catch(err => Promise.reject(err)
    )
}

async function getNpmVersion(npmName, registry) {
    const data =await getNpmInfo(npmName, registry)
    if (data) {
      return Object.keys(data.versions)
    }else{
        return []
    }
}
//根据version 获取符合semver 规范的最新版本号
function getSemverVersions(baseVersion,versions=[]) {
    return versions.filter(v=>semver.satisfies(v,`^${baseVersion}`)).sort((a,b)=> semver.gt(a,b))
}
// 根据指定 version 和包名获取符合 semver 规范的最新版本号
function getNpmLatestSemverVersion(npm, baseVersion, registry) {
    return getNpmVersion(npm, registry).then(function (versions) {
      return getSemverVersions(baseVersion, versions);
    });
  }
//获取某个包的最新版本
async function getNpmLatestVersion(packageName, registry) {
   let versionList = await getNpmVersion(packageName, registry)
   if (versionList) {
      return versionList.sort((a,b)=> semver.gt(a,b))[0]
   }else{
       return null
   }
  }

module.exports = { getNpmInfo,getSemverVersions,getNpmVersion,getNpmLatestSemverVersion,getNpmLatestVersion };
