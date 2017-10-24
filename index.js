const http = require('http')
const $ = require('cheerio')
const request = require('superagent')
const fs = require('fs')
const os = require('shelljs')

const header = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    'ContentType': 'text/html; charset=utf-8',
    'Accept-Encoding': 'gzip, deflate, sdch',
    'Accept-Language': 'zh-CN,zh;q=0.8',
    'Connection': 'keep-alive',
}

const cookies = {}

const url = 'https://qr.m.jd.com/show'

console.log('  -------------------------------------')
console.log('                请求扫码')
console.log('  -------------------------------------')
// 请求扫码
request
    .get(url)
    .set(header)
    .query({
        appid: 133,
        size: 147,
        t: new Date().getTime()
    })
    .end((err, res) => {
        const image_file = res.body
        fs.writeFile("./qr.png", image_file, "binary", err => {
            os.exec('open ./qr.png')
        })
    })