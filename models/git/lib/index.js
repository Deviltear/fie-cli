'use strict';
const path = require('path')
const fs = require('fs')
const userHome = require("user-home");
const fse = require("fs-extra");
const inquirer = require("inquirer");

const {readFile} = require("@fie-cli/util");
const simpleGit = require('simple-git');
const DEFULT_CLI_HOME = '.fie-cli'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'

class Git {
    constructor(info) {
        const { name, version, projectPath } = info || {}
        this.name = name
        this.version = version
        this.projectPath = projectPath
        this.git = simpleGit(projectPath)
    }
    async prepare() {
        await this.checkHomePath() //检查用户主目录
        await this.checkGitServer()
    }
    checkHomePath() {
        this.homePath = process.env._CLI_HOME_PATH || path.resolve(userHome, DEFULT_CLI_HOME)
        fse.ensureDirSync(this.homePath)
        if (!fs.existsSync(this.homePath)) {
            throw new Error('用户主目录检查失败')
        }
    }

    async checkGitServer() {
        const gitServerPath = this.createPath(GIT_SERVER_FILE)
       let gitServer = readFile(gitServerPath)
       if (!gitServer) {
        const { gitServer } = await inquirer.prompt([{
           
            message: '请选择您想要托管的Git平台',
            name: "gitServer",
            type: 'list',
            choices: [
                { name: "gitHub", value: 'gitHub' },
                { name: "gitee", value: 'gitee' },
              ],
          }]);
          fs.writeFile(gitServerPath,gitServer)
       }
    }
    createPath(file) {
        const gitRootPath = path.resolve(this.homePath, GIT_ROOT_DIR)
        const filePath = path.resolve(gitRootPath, file)
        fse.ensureDirSync(gitRootPath)
        return filePath
    }
  

    init() {
    }

}
module.exports = Git;
