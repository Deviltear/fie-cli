'use strict';
const path =require('path')
module.exports = systemPathFormat;

function systemPathFormat(p) {
    // TODO
if (p&& typeof p ==='string') {
  const sep   =path.sep //取出路径分隔符
  if (sep==='/') {
      return p
  }else {
      return p.replace(/\\/g,'/')
  }
}
}
