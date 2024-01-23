"use strict";
//todo: auto generate daily release branch and patch a tag. tag need get current tag version,how todo it ?
const path = require("path");
const inquirer = require("inquirer");
const nlog = require("@fie-cli/nlog");
const Command = require("@fie-cli/command");
const semver = require("semver");
const fse = require("fs-extra");
const simpleGit = require("simple-git");
const { log } = require("console");
const projectPath = process.cwd();
const simplegit = simpleGit(projectPath);
const CHOOSE_REMOTE_BRANCH = [
  { name: "develop", value: "develop" },
  { name: "test", value: "test" },
  { name: "demo", value: "demo" },
];
class Gitflow extends Command {
  init() {
    const { chooseBranch, createRelese } = this._cmd || {};
    this.chooseBranch = chooseBranch;
    this.createRelese = createRelese;
    this.pushBranch = ["develop"];
    this.date = new Date();
  }

  async exec() {
    try {
      if (this.createRelese) {
        await this.getRemoteBranchList();
        await this.syncVersionToPackageJson();
        await this.autoCommitAndPushVersionCode()
        return;
      }
      await this.commit(); //代码自动化提交
    } catch (e) {
      nlog.error(e.message);
    }
  }
  async commit() {
    await this.checkGitIgnore();
    await this.getCurrentBranch(); //add current local head branch to this instance
    /*commmit code on this develop branch*/
    await this.checkOnlyStageNotCommitted(); //check wether there is code in stage
    await this.checkConflicted();
    await this.pushRemoteRepo(this.currentBranch);
    //此处该为默认问询选择
    // if (1) {
      const { pushBranch } = await inquirer.prompt({
        type: "checkbox",
        message: "选择要合并提交至哪些远程分支,默认为develop",
        default: ["develop"],
        name: "pushBranch",
        choices: CHOOSE_REMOTE_BRANCH,
      });
      this.pushBranch =pushBranch;
    // }
    for (let branchName of this.pushBranch) {
      await this.checkoutBranch(branchName); // checkout local branch
      await this.pullRemoteRepo(branchName, {
        "--allow-unrelated-histories": null,
      });
      await this.mergeBranch(branchName, {
        "--allow-unrelated-histories": null,
      });
      await this.checkConflicted(); //check wether there is a conflicte of code
      await this.pushRemoteRepo(branchName);
    }
    await this.checkoutBranch(this.currentBranch); // completed merge remote checkout this original target branch
  }

  async checkStash() {
    const stashList = await simplegit.stashList();
    if (stashList.all.length > 0) {
      await simplegit.stash(["pop"]);
      nlog.success("stash pop 成功");
    }
  }
  async checkConflicted() {
    const status = await simplegit.status();
    if (status.conflicted.length > 0) {
      throw new Error("当前代码存在冲突，请手动处理合并后重新执行！");
    }
    nlog.success("代码冲突检查通过");
  }
  async checkOnlyStageNotCommitted() {
    const status = await simplegit.status();
    const { staged = [] } = status || {};
    if (staged.length) {
      let message;
      while (!message) {
        const { commitMsg } = await inquirer.prompt({
          type: "text",
          message: "请输入 commit 信息：",
          defaultValue: "",
          name: "commitMsg",
        });
        message = commitMsg;
      }
      await simplegit.commit(message);
      nlog.success("本地 commit 提交成功");
    }
  }
  async checkNotCommitted() {
    const status = await simplegit.status();
    if (
      status.not_added.length ||
      status.created.length ||
      status.deleted.length ||
      status.modified.length ||
      status.renamed.length
    ) {
      nlog.verbose("status", status);
      await simplegit.add(status.not_added);
      await simplegit.add(status.created);
      await simplegit.add(status.deleted);
      await simplegit.add(status.modified);
      await simplegit.add(status.renamed);
      let message;
      while (!message) {
        const { commitMsg } = await inquirer.prompt({
          type: "text",
          message: "请输入 commit 信息：",
          defaultValue: "",
          name: "commitMsg",
        });
        message = commitMsg;
      }
      await simplegit.commit(message);
      nlog.success("本地 commit 提交成功");
    }
  }
  async isLocalBranchExist(branchName) {
    const localBranchList = await simplegit.branchLocal();
    if (localBranchList.all.indexOf(branchName) >= 0) {
      return true
    }
    return false
  }
  async checkoutBranch(branch) {
    if (await this.isLocalBranchExist(branch)) {
      await simplegit.checkout(branch);
    } else {
      await simplegit.checkoutBranch(branch, `origin/${branch}`);
    }
    nlog.success(`分支切换到${branch}`);
  }

  async pushRemoteRepo(branchName) {
    await simplegit.push(["-u", "origin", branchName]).catch(async (err) => {
      console.log(err, "push出错");
      if (err.message.includes("branch is behind")) {
        //fixme:是因为远程对应的分支又有新的提交而造成的
        await this.pullRemoteRepo(branchName, {
          "--allow-unrelated-histories": null,
        });
        await this.checkConflicted();
        await simplegit.push(["-u", "origin", branchName]);
      }
      throw new Error("推送失败,请重试或手动操作");
    });

    nlog.success(`推送代码至远程 ${branchName} 分支成功`);
  }
  async checkGitIgnore() {
    const gitIgnore = path.resolve(projectPath, ".gitignore");
    if (!fs.existsSync(gitIgnore)) {
      throw new Error("请检查项目是否已经git初始化");
    }
  }
  async getCurrentBranch() {
    const status = await simplegit.status();
    this.currentBranch = status.current;
  }
  async mergeBranch(branchName, options = {}) {
    await simplegit.mergeFromTo(this.currentBranch, branchName, options);
    nlog.success(`合并${this.currentBranch}代码至 ${branchName} 分支`);
  }
  async pullRemoteRepo(branchName, options = {}) {
    await simplegit.pull("origin", branchName, options).catch((err) => {
      if (err.message.indexOf("Permission denied (publickey)") >= 0) {
        throw new Error(`请获取本地 ssh publickey 并配置到`);
      } else if (
        err.message.indexOf("Couldn't find remote ref " + branchName) >= 0
      ) {
        nlog.notice("获取远程 [" + branchName + "] 分支失败");
      } else {
        nlog.error(err.message);
      }
      nlog.error("请重新执行 fie gitFlow，如仍然报错请尝试进行手动git操作");
      process.exit(0);
    });
    nlog.success(`同步远程 ${branchName} 分支代码成功`);
  }
  async pullRemoteMasterBranch() {
    nlog.notice(`合并 [master] -> [${this.branch}]`);
    await this.pullRemoteRepo("master");
    nlog.success("合并远程 [master] 分支内容成功");
    await this.checkConflicted();
  }
  async syncVersionToPackageJson() {
    try {
      const pkg = fse.readJsonSync(`${projectPath}/package.json`);
      let incVersion = pkg.version;
      if (incVersion) {
        const lastStringList = incVersion.split('.');
        if (lastStringList[2] >= 100) {
          incVersion= semver.inc(incVersion, 'minor');
        }
        if (lastStringList[1] >= 99) {
          incVersion= semver.inc(incVersion, 'major');
        }
        incVersion= semver.inc(incVersion, 'patch');
      }
      if (pkg && pkg.version !== this.version) {
        pkg.version = incVersion;

        fse.writeJsonSync(`${projectPath}/package.json`, pkg, { spaces: 2 });
      }
      nlog.success(`已将版本号修改为${pkg.version}`)
    } catch (error) {
      nlog.error(error)
    }
  }
  async autoCommitAndPushVersionCode() {
    const status = await simplegit.status();
    const modifiedList = status?.modified?.filter(v => v !== 'package.json');

    if (modifiedList.length) {
      return nlog.error('存在版本号文件之外的修改,请检查手动提交')
    }
    await simplegit.add('./*')
      .commit('update version.json')
    await this.pullRemoteRepo(this.currentBranch)
    await this.checkConflicted()
    await this.pushRemoteRepo(this.currentBranch)
    nlog.success(`已成功创建发版分支${this.currentBranch} ,并修改版本号推送至远程`)
  }

  async inquirerYesOrNo(inquirerMsg) {
    const { isModifyVersion } = await inquirer.prompt({
      type: "list",
      message: inquirerMsg,
      defaultValue: "no",
      name: "isModifyVersion",
      choices: [{ name: "是", value: "yes" },
      { name: "否", value: "no" }]
    });
    return isModifyVersion
  }

  // get remote branch list
  async getRemoteBranchList() {
    await simplegit.fetch(["-p"]);
    // get git ls-remote
    const remoteList = await simplegit.branch(["--list", "--remote"]);
    const remoteNameList = remoteList.all;
    const yearStr = String(this.date.getFullYear());
    const monthStr = String(this.date.getMonth() + 1).padStart(2, "0");
    const dayStr = String(this.date.getDate()).padStart(2, "0");
    const dailyBranchName = `release_${yearStr}${monthStr}${dayStr}`;
    if (await this.isLocalBranchExist(dailyBranchName)) {
      if (await this.inquirerYesOrNo(`已存在本地分支${dailyBranchName},请确认是否可修改版本号. 如选择否,请将其删除后重试`) === 'yes') {
        await this.syncVersionToPackageJson();
        await this.autoCommitAndPushVersionCode()
        throw new Error('已完成并退出')
      } else {
        throw new Error('已退出')
      }
    }
    if (remoteNameList.includes(`origin/${dailyBranchName}`)) {
      if (await this.inquirerYesOrNo(`已存在远程分支 origin/${dailyBranchName},是否继续更改version`) === 'yes') {
        await this.checkoutBranch(dailyBranchName)
      } else {
        throw new Error('已退出')
      }
    } else {
      await simplegit.checkoutBranch(dailyBranchName, `origin/master`);
    }
    await this.getCurrentBranch()
  }
}
function init(argv) {
  return new Gitflow(argv);
}

module.exports = init;
module.exports.Gitflow = Gitflow;
