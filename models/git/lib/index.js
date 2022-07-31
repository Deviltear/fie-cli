'use strict';
const path = require('path')
const fs = require('fs')
const userHome = require("user-home");
const semver = require('semver');
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
const VERSION_RELEASE = 'release';
const VERSION_DEVELOP = 'dev';


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
         * @param branch 本地开发分支
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
        this.branch = null


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
        await this.init() //完成本地git仓库初始化

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
    async getRemote() {
        const gitPath = path.resolve(this.projectPath, GIT_ROOT_DIR);
        this.remote = this.gitServer.getRemote(this.login, this.name);
        if (fs.existsSync(gitPath)) {
            nlog.success('git 已完成初始化');
            return true;
        }
    };
    async init() {
        if (await this.getRemote()) {  //if has already gitinit,do not it repeatly
            return
        }
        await this.initAndAddRemote()
        await this.initCommit()

    }
    async commit() {
        //generate a develop branch
        await this.getCorrectVersion();
        /*commmit code on this develop branch*/
        await this.checkStash(); //check stash 
        await this.checkConflicted()//check wether there is a conflicte of code 
        //merge remote develop branch
        // push local develop to remote
    }

    async getCorrectVersion() {
        /** 
         * 分支规范 发布分支 release/x.y.z, 开发分支 dev/x.y.z
         * 版本号增加规范 : major/minor/patch (大中小)
        */
        nlog.notice('获取代码分支');
        const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
        let releaseVersion = null;
        if (remoteBranchList && remoteBranchList.length > 0) {
            // 获取最近的线上版本
            releaseVersion = remoteBranchList[0];
        }
        const devVersion = this.version;
        if (!releaseVersion) {
            this.branch = `${VERSION_DEVELOP}/${devVersion}`;
        } else if (semver.gt(this.version, releaseVersion)) {
            nlog.info('当前版本大于线上最新版本', `${devVersion} >= ${releaseVersion}`);
            this.branch = `${VERSION_DEVELOP}/${devVersion}`;
        } else {
            nlog.notice('当前线上版本大于或等于本地版本', `${releaseVersion} >= ${devVersion}`);
            const { incType } = await inquirer.prompt({
                type: 'list',
                choices: [{
                    name: `小版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'patch')}）`,
                    value: 'patch',
                }, {
                    name: `中版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'minor')}）`,
                    value: 'minor',
                }, {
                    name: `大版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'major')}）`,
                    value: 'major',
                }],
                defaultValue: 'patch',
                message: '自动升级版本，请选择升级版本类型',
                name: 'incType'
            });
            const incVersion = semver.inc(releaseVersion, incType);
            this.branch = `${VERSION_DEVELOP}/${incVersion}`;
            this.version = incVersion;
            this.syncVersionToPackageJson();
        }
        nlog.success(`代码分支获取成功 ${this.branch}`);
    };
    // get remote branch list
    async getRemoteBranchList(type) {
        // git ls-remote --refs
        const remoteList = await this.git.listRemote(['--refs']);
        let reg;
        if (type === VERSION_RELEASE) {
            reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
        } else {
            reg = /.+?refs\/heads\/dev\/(\d+\.\d+\.\d+)/g;
        }
        return remoteList.split('\n').map(remote => {
            const match = reg.exec(remote);
            reg.lastIndex = 0;// 通过此方式可重新执行正则匹配,以免多个符合条件的分支存在时只获取一次,而非最新
            if (match && semver.valid(match[1])) {
                return match[1];
            }
        }).filter(_ => _).sort((a, b) => { //filter(_ => _)可返回数组中值为真的元素,去空
            if (semver.lte(b, a)) {
                if (a === b) return 0;
                return -1;
            }
            return 1;
        });
    };
    // write the current release version to package.json
    syncVersionToPackageJson() {
        const pkg = fse.readJsonSync(`${this.projectPath}/package.json`);
        if (pkg && pkg.version !== this.version) {
            pkg.version = this.version;
            fse.writeJsonSync(`${this.projectPath}/package.json`, pkg, { spaces: 2 });
        }
    };
    async checkStash   ()  {
        nlog.notice('检查 stash 记录');
        const stashList = await this.git.stashList();
        if (stashList.all.length > 0) {
          await this.git.stash([ 'pop' ]);
          nlog.success('stash pop 成功');
        }
      };
    async initAndAddRemote() {
        await this.git.init(this.projectPath);
        nlog.notice('添加 git remote');
        const remotes = await this.git.getRemotes(); //gets a list of the named remotes, supply the optional verbose option as true to include the URLs and purpose of each ref
        nlog.verbose('git remotes', remotes);
        if (!remotes.find(item => item.name === 'origin')) {
            await this.git.addRemote('origin', this.remote);
        }
    }
    async initCommit() {
        await this.checkConflicted() // Check whether there is a conflict of the code 
        await this.checkNotCommitted() //Check whether there is a no committed of the code
        if (await this.checkRemoteMaster()) { //if there is origin master
            nlog.notice('远程存在 master 分支，强制合并');
            await this.pullRemoteRepo('master', { '--allow-unrelated-histories': null }); // merge the origin master force ,to related  local and origin Master branches
        } else {
            await this.pushRemoteRepo('master');
        }
    }
    async checkConflicted() {
        nlog.info('代码冲突检查')
        const status = await this.git.status();
        if (status.conflicted.length > 0) {
            throw new Error('当前代码存在冲突，请手动处理合并后再试！');
        }
        nlog.success('代码检查通过');
    }
    async checkNotCommitted() {
        const status = await this.git.status();
        if (status.not_added.length ||
            status.created.length ||
            status.deleted.length ||
            status.modified.length ||
            status.renamed.length) {
            nlog.verbose('status', status);
            await this.git.add(status.not_added);
            await this.git.add(status.created);
            await this.git.add(status.deleted);
            await this.git.add(status.modified);
            await this.git.add(status.renamed);
            let message;
            while (!message) {
                const { commitMsg } = await inquirer.prompt({
                    type: 'text',
                    message: '请输入 commit 信息：',
                    defaultValue: '',
                    name: "commitMsg",
                });
                message = commitMsg
            }
            await this.git.commit(message);
            nlog.success('本地 commit 提交成功');
        }
    };
    async checkRemoteMaster() {
        return (await this.git.listRemote(['--refs'])).includes('refs/heads/master');
    };
    async pushRemoteRepo(branchName) {
        nlog.notice(`推送代码至远程 ${branchName} 分支`);
        await this.git.push('origin', branchName);
        nlog.success('推送代码成功');
    };

    async pullRemoteRepo(branchName, options = {}) {
        nlog.notice(`同步远程 ${branchName} 分支代码`);
        await this.git.pull('origin', branchName, options).catch(err => {
            if (err.message.indexOf('Permission denied (publickey)') >= 0) {
                throw new Error(`请获取本地 ssh publickey 并配置到：${this.gitServer.getSSHKeysUrl()}，配置方法：${this.gitServer.getSSHKeysHelpUrl()}`);
            } else if (err.message.indexOf('Couldn\'t find remote ref ' + branchName) >= 0) {
                nlog.notice('获取远程 [' + branchName + '] 分支失败');
            } else {
                nlog.error(err.message);
            }
            nlog.error('请重新执行 fie publish，如仍然报错请尝试删除 .git 目录后重试');
            process.exit(0);
        });
    };
}
module.exports = Git;
