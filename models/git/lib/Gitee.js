const  GitServer = require('./GitServer')

class Gitee extends GitServer {

  constructor (){
    super('gitee')
  } 
  getTokenHelpUrl  ()  {
    return 'https://gitee.com/profile/personal_access_tokens';
  };
  getSSHKeysUrl ()  {
    return 'https://gitee.com/profile/sshkeys';
  };

  getSSHKeysHelpUrl () {
    return 'https://gitee.com/help/articles/4191';
  };
}
module.exports = Gitee