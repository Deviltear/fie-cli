"use strict";
const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const Command = require("@fie-cli/command");
//当前进程的执行文件路径
const localPath = process.cwd();
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "componet";
const getProjectTemplate = require("./getProjectTemplate");

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.hasForce = this._cmd.force;
    console.log(this._cmd, "ll");
  }
  async exec() {
    try {
      const projectRes = await this.prepare();
      if (projectRes) {
        //下载模板
        //安装模板
        this.downLoadTemplet();
        console.log(projectRes);
      }
    } catch (error) {
      console.log(error);
    }
  }
  downLoadTemplet() {}
  async prepare() {
    const template = await getProjectTemplate();
    if (!template) {
      //判断模板是否存在,不存在直接可以退出
      throw new Error("项目模板不存在");
    }
    //1.检查当前项目是否为空
    if (!this.isCwdDirEmpty()) {
      let continueTag = false;
      if (!this.force) {
        const { isContinue } = await inquirer.prompt([
          {
            type: "confirm",
            name: "isContinue",
            message: "当前进程文件夹不为空,是否继续创建项目",
            default: false,
          },
        ]);
        continueTag = isContinue;
        if (!isContinue) {
          return;
        }
      }
      if (continueTag || this.force) {
        //强制更新,情况当前目录
        const { confirmDel } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmDel",
            message: "是否确认清空当前目录,继续创建项目",
            default: false,
          },
        ]);
        if (!confirmDel) {
          return;
        }
        // fse.emptyDirSync(localPath); //fixme:这里的删除直接从硬盘里删除了,无法找回?待换成其他方式
      }
    }
    return this.getProjectInfo();
  }

  isCwdDirEmpty() {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && !["node_modules"].includes(file)
    );
    return !fileList || !fileList?.length;
  }
  async getProjectInfo() {
    let projectInfo = {};
    const { initType } = await inquirer.prompt([
      {
        type: "list",
        name: "initType",
        message: "选择初始化类型",
        default: TYPE_PROJECT,
        choices: [
          { name: "项目", value: TYPE_PROJECT },
          { name: "组件", value: TYPE_COMPONENT },
        ],
      },
    ]);
    if (initType === TYPE_PROJECT) {
      const project = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          default: "",
          validate: function (v) {
            const done = this.async();
            setTimeout(function () {
              //首字符必须英文字母
              //尾字符必须为英文字母或数字
              //字符仅可以是'_或-'
              //可利用分组写此正则
              if (
                !/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
                  v
                )
              ) {
                return done("请输入合法的项目名称");
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate: (v) => {
            return typeof v === "string";
          },
          filter: (v) => {
            return v;
          },
        },
      ]);
      projectInfo = {
        initType,
        ...project,
      };
    } else {
    }
    return projectInfo;
  }
}

function init(argv) {
  return new InitCommand(argv);
}
module.exports = { init };
module.exports.InitCommand = InitCommand;
