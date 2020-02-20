const yargs = require("yargs");

module.exports = function args(params) {
  return yargs
    .alias("h", "help")
    .option("a", {
      alias: "area",
      demand: true,
      describe: "地区编号"
    })
    .option("g", {
      alias: "good",
      demand: true,
      describe: "商品编号"
    })
    .option("t", {
      alias: "time",
      describe: "查询间隔ms",
      default: 10000,
      number: true
    })
    .option("b", {
      alias: "buy",
      describe: "是否下单",
      default: true,
      boolean: true
    })
    .usage("食用方式: yarn start -a 地区编号 -g 商品编号")
    .example("node index.js -a 2_2830_51810_0 -g 5008395")
    .locale("zh_CN").argv;
};
