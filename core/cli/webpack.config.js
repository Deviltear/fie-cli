
const path = require('path')
module.exports={

entry:'cli/index.js',
output:{
  path:path.join(__dirname,'/dist'),
  filename:'core.js'
},
mode:'development',
target:'node',
module: {
  rules: [
    {
      test: /\.(js|jsx)$/,
      use: ['happypack/loader?id=babel'],
      exclude: /node_modules/, // 不需要去转译"node\_modules"这里面的文件。
    },


    {
      test: /\.(gif|png|jpe?g|webp)$/,
      // Any image below or equal to 10K will be converted to inline base64 instead
      type: 'asset/resource',
      generator: {
        filename: isDev ? '[name][ext]' : '[name].[hash:6][ext]',
      },
    },
  ],
},

}