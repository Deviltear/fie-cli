'use strict';

module.exports = { isObject };

function isObject(t) {
    return Object.prototype.toString.call(t) === ['object Object']
}
