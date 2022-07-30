"use strict";

const semver = require("semver");
const colors = require("colors");
const LOWEST_NODE_VERSION = "12.0.0";
class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空");
    }
    if (!Array.isArray(argv) && !argv?.length) {
      throw new Error("参数不为数组");
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => {
        this.checkNodeVersion();
      });
      chain = chain.then(() => {
        this.initArgs();
      });
      chain = chain.then(() => {
        this.init();
      });
      chain = chain.then(() => {
        this.exec();
      });

      chain.catch((err) => console.log(err.message));
    });
  }
  initArgs() {
    this._cmd = this._argv[0];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }
  checkNodeVersion() {
    const currentVersion = process.version;
    if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
      throw new Error(
        colors.red(`fie-cli 需要安装v${LOWEST_NODE_VERSION} 以上版本的node.js`)
      );
    }
  }
  init() {
    throw new Error("init方法必须实现");
  }
  exec() {
    throw new Error("exec方法必须实现");
  }
}
module.exports = Command;
