const fs = require("fs");
const opn = require("opn");

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

function writeAndOpenFile(fileName, file) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, file, "binary", err => {
      if (err) {
        return reject(err);
      }
      opn(fileName);
      resolve();
    });
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function cookieParser(cookies) {
  const result = {};
  cookies.forEach(cookie => {
    const temp = cookie.split(";");
    temp.forEach(val => {
      const flag = val.split("=");
      result[flag[0]] = flag.length === 1 ? "" : flag[1];
    });
  });
  return result;
}

module.exports = {
  sleep,
  writeAndOpenFile,
  getRandomInt,
  cookieParser
};
