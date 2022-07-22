'use strict';
const ora = require('ora');

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
module.exports = { isObject, getDefaultregistry,spinnerStart,sleep };
