"use strict";
const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const userHome = require("user-home");
const Command = require("@fie-cli/command");
const Package = require("@fie-cli/package");
const { spinnerStart, sleep, cpSpawnAsync } = require("@fie-cli/util");
const nlog = require("@fie-cli/nlog");
//当前进程的执行文件路径
const currentProcessPath = process.cwd();
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "componet";
const getProjectTemplate = require("./getProjectTemplate");
const path = require("path");
const ejs = require("ejs");
const glob = require("glob");

const WHITE_COMMAND = ['npm', 'cnpm', 'yarn', 'pnpm']
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.hasForce = this._cmd.force;
  }
  async exec() {
    try {
      await this.prepare();
    } catch (error) {
      console.log(error);
    }
  }
  async installTemplate() {
      this.installNormalTemplate()
  }
  async ejsRender(options) {
    const dir = process.cwd()
   const ejsdata =  this.projectInfo
    return new Promise((resolve, reject) => {
      const { ignore } = options || {}
      glob('**', {
        cwd: dir,
        ignore,
        nodir: true
      }, (err, files) => {
        if (err) {
          reject(err)
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, ejsdata,{}, (err, result) => {
              if (err) {
                reject1(err)
              } else {
                fse.writeFileSync(filePath,result)
                resolve1(result)
              }
            })
          })
        })).then(() => resolve()).catch(err => reject(err))
      })
    })
  }
  async installNormalTemplate() {
    let spinner = spinnerStart('正在安装模板...')
    await sleep()
    //拷贝模板代码至当前目录
    try {
      const cacheTemplatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      fse.ensureDirSync(cacheTemplatePath)
      fse.ensureDirSync(currentProcessPath)

      fse.copySync(cacheTemplatePath, currentProcessPath)
      spinner.succeed('安装模板完成')
    } catch (error) {
      spinner.fail(error)
    } finally {
      spinner.stop()
    }
    const ignore = ["node_modules/**", "public/**"]


    await this.ejsRender({ ignore })
    const { installCommand, startCommand } = this.templateInfo;

    try {
      await this.commandPars(installCommand)
    } catch (error) {
      throw new Error('依赖安装失败,可手动进行安装')
    }
    try {
      await this.commandPars(startCommand)
    } catch (error) {
      throw new Error('项目启动失败,可检查后手动启动')
    }
    
  }
  async commandPars(commandStr) {
    if (commandStr) {
      const splitCmdList = commandStr.split(" ")
      const cmd = this.checkWhiteCommand(splitCmdList[0])
      if (!cmd) {
        nlog.error(`命令 ${commandStr} 不是一个合法的安装依赖或启动命令`)
      }
      const args = splitCmdList.slice(1)
      return await cpSpawnAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }

  }
  checkWhiteCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd
    }
  }
  async installCustomTemplate() {
   //todo:待开发自定义模板安装
  }

  async downLoadTemplate(templateList = []) {
    const { templateName } = await inquirer.prompt([{
      choices: createTemplateChoice(templateList),
      message: '请选择项目模板',
      name: "templateName",
      type: 'rawlist',
    }]);
    const choocedTemplateInfo = templateList.find(item => item?.name == templateName)
    this.templateInfo = choocedTemplateInfo
    const { npmName, packageVersion } = choocedTemplateInfo
    const targetPath = path.resolve(userHome, '.fie-cli', 'template')
    const storePath = path.resolve(userHome, '.fie-cli', 'template', 'node_modules')
    const templateNpm = new Package({
      targetPath,
      storePath,
      packageName: npmName,
      packageVersion
    })
    this.templateNpm = templateNpm
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...')
      await sleep()
      try {
        await templateNpm.install()
        nlog.success('下载模板成功')

      } catch (e) {
      } finally {
        spinner.stop()
      }

    } else {
      const spinner = spinnerStart('正在更新模板...')
      await sleep()
      try {
        await templateNpm.update()
        nlog.success('更新模板成功')

      } catch (e) {
      } finally {
        spinner.stop()
      }
    }
  }

  async prepare() {
    const template = await getProjectTemplate();
    if (!template || !template?.length) {
      //判断模板是否存在,不存在直接可以退出
      throw new Error("项目模板不存在");
    }
    //1.检查当前项目是否为空
    if (!isCwdDirEmpty()) {
      let continueTag = false;
      if (!this.force) {
        const splitStringList = currentProcessPath.split('/')
        const relativeProcessPath = splitStringList[splitStringList?.length - 1]
        const { isContinue } = await inquirer.prompt([
          {
            type: "confirm",
            name: "isContinue",
            message: `当前执行目录 ${relativeProcessPath} 文件夹不为空,是否继续创建项目`,
            default: false,
          },
        ]);
        continueTag = isContinue;
        if (!isContinue) {
          return;
        }
      }
      if (continueTag || this.force) {
        //强制更新,清空当前目录
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
        let spinner = spinnerStart('正在清空目录...')
        await sleep(500)
        await fse.emptyDir(currentProcessPath); //fixme:目前是删除至回收站,是否有方式删除至回收站
        spinner.stop()
      }
    }
    const projectInfoRes = await this.getProjectInfo()
    this.projectInfo = projectInfoRes
    await this.downLoadTemplate(template);
    await this.installTemplate()
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
function isCwdDirEmpty() {
  let fileList = fs.readdirSync(currentProcessPath);
  fileList = fileList.filter(
    (file) => !file.startsWith(".") && !["node_modules"].includes(file)
  );
  return !fileList || !fileList?.length;
}
function init(argv) {
  return new InitCommand(argv);
}
function createTemplateChoice(list) {
  return list.map(item => ({
    value: item.name,
    name: item.name,
  }));
}
module.exports = { init };
module.exports.InitCommand = InitCommand;
