
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
      exclude: /node_modules/, // 不需要去转译"node\_modules"这里面的文件。
      use:{
        loader:'babel-loader',
        options:{
          presets:["@babel/preset-env"],
          plugins:[
            ['@babel/plugin-transform-runtime',
            {
              corejs:3,
              regenerator:true,
              useESModules:true
            }]
          ]
        }
      },

    },


  ],
},

}