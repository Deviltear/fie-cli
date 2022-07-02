'use strict';

module.exports = { isObject,getDefaultregistry };

function isObject(t) {
    return Object.prototype.toString.call(t) === ['object Object']
}
function getDefaultregistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}