


class GitServer {
  constructor(type, token) {
    this.type = type
    this.token = token

  }

  setToken() {
    error("setToken")
  }
  createRepo() { //创建远程仓库
    error("createRepo")
  }
  createOrgRepo() { //创建远程组织仓库
    error("createOrgRepo")
  }
  getRemote() { //创建远程仓库
    error("getRemote")
  }
  getUser() { //获取用户
    error("getUser")
  }
  getOrg() { //获取组织
    error("getOrg")
  }

  getTokenHelpUrl() {
    error('getTokenHelpUrl');
  };
  getSSHKeysUrl() {
    error('getSSHKeysUrl');
  };
  getSSHKeysHelpUrl() {
    error('getSSHKeysHelpUrl');
  };

}
function error(methodName) {
  throw new Error(`${methodName} 必须被实现`)
}
module.exports = GitServer