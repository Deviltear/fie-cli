'use strict';

const path = require('path')
const inquirer = require("inquirer");
const nlog = require('@fie-cli/nlog');
const Command = require("@fie-cli/command");

const simpleGit = require('simple-git');
const projectPath = process.cwd()
const simplegit = simpleGit(projectPath)
const remoteBranchListObj = {
    'develop': ['develop'],
    'release': ['release'],
    'all': ['develop', 'release']
}
const CHOOSE_REMOTE_BRANCH = [{ name: 'develop', value: "develop" }, { name: 'release', value: "release" }, { name: 'devAndrelease', value: "all" }]
class Gitflow extends Command {

    init() {
        const { allPush, create } = this._cmd || {}
        this.allPush = allPush
        this.create = create
        this.pushBranch = remoteBranchListObj.all
    }

    async exec() {
        try {
            await this.commit() //代码自动化提交
        } catch (e) {
            nlog.error(e.message)
        }
    }
    async commit() {

        await this.checkGitIgnore()
        await this.getCurrentBranch() //add current local head branch to this instance
        /*commmit code on this develop branch*/
        await this.checkStash(); //check stash 
        await this.checkNotCommitted()//check wether there is code in stage 
        await this.checkConflicted()
        await this.pushRemoteRepo(this.currentBranch)

        if (this.allPush) {
            const { pushBranch } = await inquirer.prompt({
                type: 'list',
                message: '选择要合并提交至那些远程分支',
                defaultValue: 'all',
                name: "pushBranch",
                choices: CHOOSE_REMOTE_BRANCH
            });
            this.pushBranch = remoteBranchListObj[pushBranch]
        }
        this.pushBranch.forEach(async (branchName) => {

            await this.checkoutBranch(branchName) // checkout local branch 
            await this.mergeBranch(branchName)
            await this.pullRemoteRepo(branchName,{ '--allow-unrelated-histories': null })
            await this.checkConflicted()//check wether there is a conflicte of code 
            await this.pushRemoteRepo(branchName,{ '--allow-unrelated-histories': null })

        });



        // await this.pullRemoteMasterAndBranch(); //merge remote master branch and then merge remote current branch

    }

    async checkStash() {
        const stashList = await simplegit.stashList();
        if (stashList.all.length > 0) {
            await simplegit.stash(['pop']);
            nlog.success('stash pop 成功');
        }
    };
    async checkConflicted() {
        const status = await simplegit.status();
        if (status.conflicted.length > 0) {
            throw new Error('当前代码存在冲突，请手动处理合并后重新执行！');
        }
        nlog.success('代码冲突检查通过');
    }
    async checkNotCommitted() {
        const status = await simplegit.status();
        if (status.not_added.length ||
            status.created.length ||
            status.deleted.length ||
            status.modified.length ||
            status.renamed.length) {
            nlog.verbose('status', status);
            await simplegit.add(status.not_added);
            await simplegit.add(status.created);
            await simplegit.add(status.deleted);
            await simplegit.add(status.modified);
            await simplegit.add(status.renamed);
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
            await simplegit.commit(message);
            nlog.success('本地 commit 提交成功');
        }
    };
    async checkoutBranch(branch) {
        const localBranchList = await simplegit.branchLocal();
        if (localBranchList.all.indexOf(branch) >= 0) {
            await simplegit.checkout(branch);
        } else {
            await simplegit.checkoutLocalBranch(branch);
        }
        nlog.success(`分支切换到${branch}`);
    };

    async pushRemoteRepo(branchName) {
        nlog.notice(`推送代码至远程 ${branchName} 分支`);
        await simplegit.push('origin', branchName);
        nlog.success('推送代码成功');
    };
    async checkGitIgnore() {
        const gitIgnore = path.resolve(projectPath, '.gitignore');
        if (!fs.existsSync(gitIgnore)) {
            throw new Error('请检查项目是否已经git初始化')
        }
    };
    async getCurrentBranch() {
        const status = await simplegit.status()
        this.currentBranch = status.current
    }
    async mergeBranch(branchName) {
        await simplegit.mergeFromTo(this.currentBranch, branchName, { '--allow-unrelated-histories': null })
        nlog.success(`合并${this.currentBranch}代码至 ${branchName} 分支`);
    };
    async pullRemoteRepo(branchName, options = {}) {
        nlog.notice(`同步远程 ${branchName} 分支代码`);
        await simplegit.pull('origin', branchName, options).catch(err => {
            if (err.message.indexOf('Permission denied (publickey)') >= 0) {
                throw new Error(`请获取本地 ssh publickey 并配置到`);
            } else if (err.message.indexOf('Couldn\'t find remote ref ' + branchName) >= 0) {
                nlog.notice('获取远程 [' + branchName + '] 分支失败');
            } else {
                nlog.error(err.message);
            }
            nlog.error('请重新执行 fie gitFlow，如仍然报错请尝试删除 .git 目录后重试');
            process.exit(0);
        });
    };
    async pullRemoteMasterAndBranch() {
        nlog.notice(`合并 [master] -> [${this.branch}]`);
        await this.pullRemoteRepo('master');
        nlog.success('合并远程 [master] 分支内容成功');
        await this.checkConflicted();
        await this.pullRemoteRepo(this.branch);
        nlog.success(`合并远程 [${this.branch}] 分支内容成功`);

    };
}
function init(argv) {
    return new Gitflow(argv);
}


module.exports = init;
module.exports.Gitflow = Gitflow;