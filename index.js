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

let cookies = {}

const qrUrl = 'https://qr.m.jd.com/show'

console.log('   -------------------------------------   ')
console.log('                请求扫码')
console.log('   -------------------------------------   ')
// 请求扫码
request
    .get(qrUrl)
    .set(header)
    .query({
        appid: 133,
        size: 147,
        t: new Date().getTime()
    })
    .end((err, res) => {
        cookies = cookieParser(res.header['set-cookie'])
        const cookieData = res.header['set-cookie'];
        const image_file = res.body
        fs.writeFile("./qr.png", image_file, "binary", err => {
            os.exec('open ./qr.png')

            // 监听扫码结果
            let tryCount = 100
            let isOk = false
            const scanUrl = 'https://qr.m.jd.com/check'
           const timer = setInterval(() => {
                const callback = {}
                let name;
                callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
                    if (data.code === 200) {
                        console.log(`   登录成功`)
                        clearInterval(timer)
                        return
                    }
                    console.log(`   ${data.msg}`)
                }

                request
                    .get(scanUrl)
                    .set(header)
                    .set({
                        Host: 'qr.m.jd.com',
                        Referer: 'https://passport.jd.com/new/login.aspx'
                    })
                    .set('Cookie', cookieData.join(';'))
                    .query({
                        callback: name,
                        appid: 133,
                        token: cookies['wlfstk_smdl'],
                        _: new Date().getTime()
                    })
                    .end((err, res) => {
                        eval('callback.' + res.text)
                    })


            }, 1000)
        })
    })





function cookieParser(cookies) {
    const result = {}
    cookies.forEach(cookie => {
        const temp = cookie.split(';')
        temp.forEach(val => {
            const flag = val.split('=')
            result[flag[0]] = flag.length === 1 ? '' : flag[1]
        })
    })
    return result;
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

function jsonpParser(jsonp) {
    const result = {}

}