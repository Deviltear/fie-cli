"use strict";
//todo: auto generate daily release branch and patch a tag. tag need get current tag version,how todo it ?
const path = require("path");
const inquirer = require("inquirer");
const nlog = require("@fie-cli/nlog");
const Command = require("@fie-cli/command");
const semver = require("semver");
const fse = require("fs-extra");
const simpleGit = require("simple-git");
const projectPath = process.cwd();
const simplegit = simpleGit(projectPath);
const remoteBranchListObj = {
  develop: ["develop"],
  release: ["release"],
  all: ["develop", "release"],
};
const CHOOSE_REMOTE_BRANCH = [
  { name: "develop", value: "develop" },
  { name: "release", value: "release" },
  { name: "developAndrelease", value: "all" },
];
class Gitflow extends Command {
  init() {
    const { chooseBranch, createRelese } = this._cmd || {};
    this.chooseBranch = chooseBranch;
    this.createRelese = createRelese;
    this.pushBranch = remoteBranchListObj.all;
    this.date = new Date();
  }

  async exec() {
    try {
      if (this.createRelese) {
      //  await this.getRemoteBranchList();
      //  await this.syncVersionToPackageJson();
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
    if (this.chooseBranch) {
      const { pushBranch } = await inquirer.prompt({
        type: "list",
        message: "选择要合并提交至哪些远程分支",
        defaultValue: "all",
        name: "pushBranch",
        choices: CHOOSE_REMOTE_BRANCH,
      });
      this.pushBranch = remoteBranchListObj[pushBranch];
    }
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
    // todo: generate daily branch need do pullRemoteMasterBranch fn
    // await this.pullRemoteMasterBranch(); //merge remote master branch and then merge remote current branch
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
  async checkoutBranch(branch) {
    const localBranchList = await simplegit.branchLocal();
    if (localBranchList.all.indexOf(branch) >= 0) {
      await simplegit.checkout(branch);
    } else {
      await simpleGit.checkoutBranch(branch, `origin/${branch}`);
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
  const pkg = fse.readJsonSync(`${projectPath}/version.json`);
  const releaseVersion = pkg.version;
  const { incType } = await inquirer.prompt({
    type: "list",
    choices: [
      {
        name: `小版本（${releaseVersion} -> ${semver.inc(
          releaseVersion,
          "patch",
        )}）`,
        value: "patch",
      },
      {
        name: `中版本（${releaseVersion} -> ${semver.inc(
          releaseVersion,
          "minor",
        )}）`,
        value: "minor",
      },
      {
        name: `大版本（${releaseVersion} -> ${semver.inc(
          releaseVersion,
          "major",
        )}）`,
        value: "major",
      },
    ],
    defaultValue: "patch",
    message: "自动升级版本，请选择升级版本类型",
    name: "incType",
  });
  if (pkg && pkg.version !== this.version) {
    const incVersion = semver.inc(releaseVersion, incType);
    pkg.version = incVersion;

    fse.writeJsonSync(`${projectPath}/version.json`, pkg, { spaces: 2 });
  } 
  nlog.success(`已将版本号修改为${pkg.version}`)
} catch (error) {
  nlog.error(error)
}
  }
  async autoCommitAndPushVersionCode() {
    const status = await simplegit.status();
    console.log(status);

    const modifiedList =status?.modified?.filter(v=>v!== 'version.json');

    if (modifiedList.length) {
      return nlog.error('存在版本号文件之外的修改,请检查手动提交')
    }
    await simplegit.add('./*')
    .commit('update version.json')
    await simplegit
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

    if (remoteNameList.includes(`origin/${dailyBranchName}`)) {
      nlog.error(`已存在远程分支 origin/${dailyBranchName}`);
    } else {
      await simplegit.checkoutBranch(dailyBranchName, `origin/master`);
    }
  }
}
function init(argv) {
  return new Gitflow(argv);
}

module.exports = init;
module.exports.Gitflow = Gitflow;
