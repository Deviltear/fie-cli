'use strict';
const ora = require('ora');
const cp = require("child_process");
function isObject(t) {
    return Object.prototype.toString.call(t) === '[object Object]'
}
function getDefaultregistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

function spinnerStart(startString="Loading",startText) {
    return ora(startString).start(startText);

}
function sleep(timeOut=1000) {
    return new Promise(resolve => setTimeout(resolve, timeOut))
}
function cpSpawnAsync(command, args, options) { //兼容win 系统的情况,win 终端是cmd 命令
   

    return new Promise((resolve,rejects)=>{
        const win32 = process.platform === "win32";
        const cmd = win32 ? "cmd" : command;
        const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
      
        const p =  cp.spawn(cmd, cmdArgs, options);
        p.on('error',e=>rejects(e))
        p.on('exit',e=>resolve(e))

    })
  }
module.exports = { isObject, getDefaultregistry,spinnerStart,sleep,cpSpawnAsync };
