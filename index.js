const $ = require('cheerio')
const request = require('axios')
const fs = require('fs')
const opn = require('opn')
const iconv = require('iconv-lite')

const defaultInfo = {
    header: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'Content-Type': 'text/plain;charset=utf-8',
        // 'accept':'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6,en;q=0.4,en-US;q=0.2',
        'Connection': 'keep-alive',
    },
    qrUrl: 'https://qr.m.jd.com/show',
    scanUrl: 'https://qr.m.jd.com/check',
    loginUrl: 'https://passport.jd.com/uc/qrCodeTicketValidation',
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

const outData = {
    name: '',
    price: '',
    link: '',
    stockStatus: ''
}

console.log()
console.log('   -------------------------------------   ')
console.log('                请求扫码')
console.log('   -------------------------------------   ')
console.log()



requestScan().then(val => {
    return listenScan()
}).then(ticket => {
    return login(ticket)
}).then(cookie => {
    console.log('   登录成功')
    return goodInfo()
}).then(goodInfo => {
    const body = $.load(iconv.decode(goodInfo.data, 'gb2312'))
    outData.name = body('div.sku-name').text()
    return Promise.all([goodPrice(), goodStatus()])
}).then(all => {
    outData.price = all[0][0].p
    outData.stockStatus = all[1]
    console.log(`
    商品详情------------------------------

    商品名：${outData.name}
    价格：${outData.price}
    状态：${outData.stockStatus}
    连接：${outData.link}
    -------------------------------------
    `)
})



// 请求扫码
function requestScan() {
    return request({
            method: 'get',
            url: defaultInfo.qrUrl,
            headers: defaultInfo.header,
            params: {
                appid: 133,
                size: 147,
                t: new Date().getTime()
            },
            responseType: 'arraybuffer'
        })
        .then(res => {
            defaultInfo.cookies = cookieParser(res.headers['set-cookie'])
            defaultInfo.cookieData = res.headers['set-cookie'];
            const image_file = res.data;
            fs.writeFile("./qr.png", image_file, 'binary', err => {
                opn('qr.png')
            })
        })
}

// 监听扫码
function listenScan() {
    return new Promise((resolve, reject) => {
        // 监听扫码结果
        const timer = setInterval(() => {
            const callback = {}
            let name;
            callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
                console.log(`   ${data.msg || '扫码成功，正在登录'}`)
                if (data.code === 200) {
                    clearInterval(timer)
                    resolve(data.ticket)
                }
            }

            request({
                method: 'get',
                url: defaultInfo.scanUrl,
                headers: Object.assign({
                    Host: 'qr.m.jd.com',
                    Referer: 'https://passport.jd.com/new/login.aspx',
                    Cookie: defaultInfo.cookieData.join(';')
                }, defaultInfo.header),
                params: {
                    callback: name,
                    appid: 133,
                    token: defaultInfo.cookies['wlfstk_smdl'],
                    _: new Date().getTime()
                },
            }).then(res => {
                eval('callback.' + res.data)
            })


        }, 1000)
    })
}

// 登录
function login(ticket) {
    return request({
        method: 'get',
        url: defaultInfo.loginUrl,
        headers: Object.assign({
            Host: 'passport.jd.com',
            Referer: 'https://passport.jd.com/uc/login?ltype=logout',
            Cookie: defaultInfo.cookieData.join('')
        }, defaultInfo.header),
        params: {
            t: ticket
        },
    }).then(res => {
        defaultInfo.header['p3p'] = res.headers['p3p']
        return defaultInfo.cookieData = res.headers['set-cookie']
    })
}

// 商品信息
function goodInfo(areaId, stockId) {
    const data = {
        areaId: areaId || '2_2830_51810_0',
        stockId: stockId || 5008395
    }

    const stockLink = `http://item.jd.com/${data.stockId}.html`

    return request({
        method: 'get',
        url: stockLink,
        headers: Object.assign(defaultInfo.header, {
            cookie: defaultInfo.cookieData.join('')
        }),
        responseType: 'arraybuffer'
    })
}

// 商品价格
function goodPrice(stockId) {
    stockId = stockId || 5008395
    return new Promise((resolve, reject) => {
        const callback = {}
        let name;
        callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
            resolve(data);
        }
        request({
            method: 'get',
            url: 'http://p.3.cn/prices/mgets',
            headers: Object.assign(defaultInfo.header, {
                cookie: defaultInfo.cookieData.join('')
            }),
            params: {
                type: 1,
                pduid: new Date().getTime(),
                skuIds: 'J_' + stockId,
                callback: name,
            },
        }).then(res => {
            eval('callback.' + res.data)
        })
    })
}

// 商品状态
function goodStatus(stockId, areaId) {
    stockId = stockId || 5008395
    arerId = areaId || '2_2830_51810_0'
    return new Promise((resolve, reject) => {
        const callback = {}
        let name;
        callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
            resolve(data[stockId].StockStateName);
        }
        request({
            method: 'get',
            url: 'http://c0.3.cn/stocks',
            headers: Object.assign(defaultInfo.header, {
                cookie: defaultInfo.cookieData.join('')
            }),
            params: {
                type: 'getstocks',
                area: arerId,
                skuIds: stockId,
                callback: name,
            },
            responseType: 'arraybuffer'
        }).then(res => {
            const data = iconv.decode(res.data, 'gb2312')
            eval('callback.' + data)
        })
    })
}

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