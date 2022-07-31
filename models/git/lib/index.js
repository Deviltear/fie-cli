'use strict';
const path = require('path')
const fs = require('fs')
const userHome = require("user-home");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const terminalLink = require('terminal-link')
const { readFile, writeFile, spinnerStart } = require("@fie-cli/util");
const nlog = require('@fie-cli/nlog');
const simpleGit = require('simple-git');
const GitHub = require('./GitHub');
const Gitee = require('./Gitee');
const DEFULT_CLI_HOME = '.fie-cli'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'
const GIT_TOKEN_FILE = '.git_token'
const GIT_OWNER_FILE = '.git_owner'
const GIT_LOGIN_FILE = '.git_login'
const GIT_IGNORE_FILE = '.gitignore';



const GIT_OWNER_TYPE = [{
    name: '个人',
    value: 'user',
}, {
    name: '组织',
    value: 'org',
}];

const GIT_OWNER_TYPE_ONLY = [{
    name: '个人',
    value: 'user',
}];
class Git {
    constructor(info) {
        /**
         * 构造函数
         *
         * @param projectPath git 仓库本地目录
         * @param name git 仓库名称
         * @param version git 分支号
         * @param homePath 缓存根目录
         * @param refreshToken 是否强制刷新token数据
         * @param refreshOwner 是否强制刷新own数据
         * @param refreshServer 是否强制刷新git远程仓库类型
         * @param prod 是否为正式发布，正式发布后会建立tag删除开发分支
         * @param sshUser 远程服务器用户名
         * @param sshIp 远程服务器IP
         * @param sshPath 远程服务器路径
         */
        const { name, version, projectPath, refreshServer = false, refreshToken = false, refreshOwner = false } = info || {}
        this.name = name
        this.version = version
        this.projectPath = projectPath
        this.git = simpleGit(projectPath)
        this.refreshServer = refreshServer
        this.refreshToken = refreshToken
        this.refreshOwner = refreshOwner
        this.owner = null;
        this.login = null;
        this.user = 'user'
        this.orgs = null
        this.homePath = null
        this.gitServer = null  //这些一开始为null的是为了先定义出来,方便阅读,都用到了那些属性


    }
    // 核心业务逻辑，提交代码前的准备工作
    async prepare() {
        await this.checkHomePath() //检查用户主目录
        await this.checkGitServer() //检查用户远程仓库类型
        await this.checkGitToken() //获取远程仓库类型
        await this.getUserAndOrgs() //获取远程仓库类型
        await this.CheckRemoteGit() //确认远程仓库类型
        await this.CheckRemoteGit() //确认远程仓库类型
        await this.checkRepo()//确认远程仓库存在并可自动创建
        await this.checkGitIgnore()//检查或创建.gitignore 文件

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
        if (!token || this.refreshToken) {
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
    async getUserAndOrgs() {
        this.user = await this.gitServer.getUser()
        if (!this.user) {
            throw new Error('用户信息获取失败,请检查Token是否设置正确');
        }
        this.orgs = await this.gitServer.getOrgs()
        console.log(this.orgs, 'ss');

    }

    async CheckRemoteGit() {
        const ownerPath = this.createPath(GIT_OWNER_FILE)
        const loginPath = this.createPath(GIT_LOGIN_FILE)
        let owner = readFile(ownerPath)
        let login = readFile(loginPath)
        if (!owner || !login || this.refreshOwner) {
            const { ownerType } = await inquirer.prompt({
                type: 'list',
                message: '请选择远程仓库类型',
                name: 'ownerType',
                defaultValue: '',
                choices: this.orgs.length > 0 ? GIT_OWNER_TYPE : GIT_OWNER_TYPE_ONLY
            });
            owner = ownerType
            if (owner === 'user') {
                login = this.user.login;
            } else {
                const { orgType } = await inquirer.prompt({
                    type: 'list',
                    message: '请选择',
                    name: 'orgType',
                    choices: this.orgs.map(item => ({
                        name: item.login,
                        value: item.login,
                    }))
                });
                login = orgType
            }
            writeFile(ownerPath, owner);
            writeFile(loginPath, login);
            nlog.success('git owner写入成功', `${owner} -> ${ownerPath}`);
            nlog.success('git login写入成功', `${login} -> ${loginPath}`);
        } else {
            nlog.success('git owner 获取成功', owner);
            nlog.success('git login 获取成功', login);
        }
        this.owner = owner;
        this.login = login;

    }

    async checkRepo() {
        let repo = await this.gitServer.getRepo(this.login, this.name)
        if (!repo) {
            let spinner = spinnerStart('开始创建远程仓库')
            try {
                if (this.owner === "user") {
                    repo = await this.gitServer.createRepo(this.name);
                } else {
                    repo = await this.gitServer.createOrgRepo(this.name, this.login);
                }
            } finally {
                spinner.stop();
            }
            if (repo) {
                nlog.success('远程仓库创建成功');
            } else {
                throw new Error('远程仓库创建失败');
            }
        }
        nlog.success('远程仓库信息获取成功');
        this.repo = repo;
    }

    // 检查 .gitignore
    async checkGitIgnore() {
        const gitIgnore = path.resolve(this.projectPath, GIT_IGNORE_FILE);
        if (!fs.existsSync(gitIgnore)) {

            writeFile(gitIgnore, `.DS_Store
node_modules
/dist


# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`);
            nlog.success('自动写入 .gitignore 文件');

        }
    };

    createGitServer(gitServer) {
        if (gitServer === "gitHub") {
            return new GitHub()
        }
        if (gitServer === "gitee") {

            return new Gitee()
        }
    }
    // 创建缓存目录
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
