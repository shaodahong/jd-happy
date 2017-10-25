const http = require('http')
const $ = require('cheerio')
const request = require('superagent')
const fs = require('fs')
const os = require('shelljs')
const opn = require('opn')

const defaultInfo = {
    header: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
        'ContentType': 'text/html; charset=utf-8',
        'Accept-Encoding': 'gzip, deflate, sdch',
        'Accept-Language': 'zh-CN,zh;q=0.8',
        'Connection': 'keep-alive',
    },
    qrUrl: 'https://qr.m.jd.com/show',
    scanUrl: 'https://qr.m.jd.com/check',
    cookies: null,
    cookieData: null,
    getStockState(stockState) {
        switch (stockState) {
            case 33:
                return '有货'
            case 34:
                return '无货'
        }
    }
}

console.log('   -------------------------------------   ')
console.log('                请求扫码')
console.log('   -------------------------------------   ')


// requestScan().then(() => {
//     return listenScan()
// }).then(val => {
//     console.log(val)
// })


// 请求扫码
function requestScan() {
    return new Promise((resolve, reject) => {
        request
            .get(defaultInfo.qrUrl)
            .set(defaultInfo.header)
            .query({
                appid: 133,
                size: 147,
                t: new Date().getTime()
            })
            .end((err, res) => {
                defaultInfo.cookies = cookieParser(res.header['set-cookie'])
                defaultInfo.cookieData = res.header['set-cookie'];
                const image_file = res.body
                fs.writeFile("./qr.png", image_file, "binary", err => {
                    opn('qr.png')
                    resolve()
                })
            })
    })
}

function listenScan() {
    return new Promise((resolve, reject) => {
        // 监听扫码结果
        const timer = setInterval(() => {
            const callback = {}
            let name;
            callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
                if (data.code === 200) {
                    clearInterval(timer)
                    resolve(`   登录成功`)
                    return
                }
                console.log(`   ${data.msg}`)
            }

            request
                .get(defaultInfo.scanUrl)
                .set(defaultInfo.header)
                .set({
                    Host: 'qr.m.jd.com',
                    Referer: 'https://passport.jd.com/new/login.aspx'
                })
                .set('Cookie', defaultInfo.cookieData.join(';'))
                .query({
                    callback: name,
                    appid: 133,
                    token: defaultInfo.cookies['wlfstk_smdl'],
                    _: new Date().getTime()
                })
                .end((err, res) => {
                    eval('callback.' + res.text)
                })


        }, 1000)
    })
}



function goodInfo(areaId, stockId) {
    const data = {
        areaId: areaId || '2_2830_51810_0',
        stockId: stockId || 5008395
    }

    const stockLink = `http://item.jd.com/${data.stockId}.html`

    request
        .get(stockLink)
        .end((err, res) => {
            const tag = $.load(res.text, {decodeEntities: false})

            const name = tag('.sku-name').text()
            console.log(name)
        })

}

goodInfo()

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