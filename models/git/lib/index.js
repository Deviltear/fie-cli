'use strict';
const path = require('path')
const fs = require('fs')
const userHome = require("user-home");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const terminalLink = require('terminal-link')
const { readFile, writeFile } = require("@fie-cli/util");
const nlog = require('@fie-cli/nlog');
const simpleGit = require('simple-git');
const GitHub = require('./GitHub');
const Gitee = require('./Gitee');
const DEFULT_CLI_HOME = '.fie-cli'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'
const GIT_TOKEN_FILE = '.git_token'


class Git {
    constructor(info) {
        const { name, version, projectPath, refreshGit = false } = info || {}
        this.name = name
        this.version = version
        this.projectPath = projectPath
        this.git = simpleGit(projectPath)
        this.refreshGit = refreshGit

    }
    async prepare() {
        await this.checkHomePath() //检查用户主目录
        await this.checkGitServer() //检查用户远程仓库类型
        await this.checkGitToken() //获取远程仓库类型
    }


    checkHomePath() {
        this.homePath = process.env?._CLI_HOME_PATH ? path.resolve(userHome, process.env._CLI_HOME_PATH) : path.resolve(userHome, DEFULT_CLI_HOME)
        fse.ensureDirSync(this.homePath)
        if (!fs.existsSync(this.homePath)) {
            throw new Error('用户主目录检查失败')
        }
    }

    async checkGitServer() {
        const gitServerPath = this.createPath(GIT_SERVER_FILE)
        let gitServer = readFile(gitServerPath)

        if (!gitServer || this.refreshServer) {
            const { gitServerType } = await inquirer.prompt([{

                message: '请选择您想要托管的Git平台',
                name: "gitServerType",
                type: 'list',
                choices: [
                    { name: "gitHub", value: 'gitHub' },
                    { name: "gitee", value: 'gitee' },
                ],
            }]);
            gitServer = gitServerType
            writeFile(gitServerPath, gitServer)
            nlog.success('git server写入成功', `${gitServer} -> ${gitServerPath}`);
        } else {
            nlog.success('git server获取成功', gitServer);
        }
        this.gitServer = this.createGitServer(gitServer)
    }

    async checkGitToken() {
        const tokenPath = this.createPath(GIT_TOKEN_FILE)
        let token = readFile(tokenPath)
        if (!token) {
            nlog.warn(`${this.gitServer.type} token未生成,请先生成${this.gitServer.type}token, ${terminalLink('链接:', this.gitServer?.getTokenHelpUrl())}`)
            const { token } = await inquirer.prompt({
                type: 'password',
                message: '请将token复制到这里',
                name: 'token',
                defaultValue: '',
            });
            writeFile(tokenPath, token);
            nlog.success('token 写入成功', `${token} -> ${tokenPath}`);
        } else {
            nlog.success('token 获取成功', tokenPath);
        }
        this.token = token;
        this.gitServer.setToken(token);
    }

    createGitServer(gitServer) {
        if (gitServer === "gitHub") {
            console.log('github成功');
            return new GitHub()
        }
        if (gitServer === "gitee") {
            console.log('gitee成功');

            return new Gitee()
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
