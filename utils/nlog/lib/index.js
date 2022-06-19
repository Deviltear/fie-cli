'use strict';

const log=require("npmlog")
log.level = process.env.LOG_LEAVE? process.env.LOG_LEAVE:'info' //打印等级.默认info,通过调试环境判断debugg 模式
log.addLevel('success',2000,{fg:'green',bold:true})
log.heading='fie'//定制输出前缀
log.headingStyle={fg:'yellow',bg:'black'}//前缀样式
module.exports = log;
