// 解析命令行参数
const args = require('yargs').alias('h', 'help')
    .option('a', {
        alias: 'area',
        demand: true,
        describe: '地区编号',
    })
    .option('g', {
        alias: 'good',
        demand: true,
        describe: '商品编号',
    })
    .option('t', {
        alias: 'time',
        describe: '查询间隔ms',
        default: '10000'
    })
    .option('b', {
        alias: 'buy',
        describe: '是否下单',
        default: true
    })
    .usage('Usage: node index.js -a 地区编号 -g 商品编号')
    .example('node index.js -a 2_2830_51810_0 -g 5008395')
    .argv;

const $ = require('cheerio')
const request = require('axios')
const fs = require('fs')
const opn = require('opn')
const iconv = require('iconv-lite')
const puppeteer = require('puppeteer')

// 初始化默认的信息
const defaultInfo = {
    header: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'Content-Type': 'text/plain;charset=utf-8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6,en;q=0.4,en-US;q=0.2',
        'Connection': 'keep-alive',
    },
    qrUrl: 'https://qr.m.jd.com/show',
    scanUrl: 'https://qr.m.jd.com/check',
    loginUrl: 'https://passport.jd.com/uc/qrCodeTicketValidation',
    cookies: null,
    cookieData: null,
    areaId: args.a,
    goodId: args.g,
    time: +args.t || 10000,
    ticket: '',
    token: '',
    uuid: '',
    eid: '',
    fp: '',
}

// 是否下单
const isBuy = Boolean(args.b) || true

// 初始化输出的商品信息
const outData = {
    name: '',
    price: '',
    link: `http://item.jd.com/${defaultInfo.goodId}.html`,
    stockStatus: '',
    time: '',
    cartLink: ''
}

console.log()
console.log('   正在初始化浏览器……')
puppeteer.launch().then(async browser => {
    console.log('   初始化完成，开始抓取页面')
    const page = await browser.newPage();
    await page.goto('https://passport.jd.com/new/login.aspx', {
        waitUntil: 'networkidle'
    });
    await sleep(1000)
    console.log('   页面抓取完成，开始分析页面')
    const inputs = await page.evaluate(res => {
        const result = document.querySelectorAll('input')
        const data = {}

        for (let v of result) {
            switch (v.getAttribute('id')) {
                case 'token':
                    data.token = v.value
                    break
                case 'uuid':
                    data.uuid = v.value
                    break
                case 'eid':
                    data.eid = v.value
                    break
                case 'sessionId':
                    data.fp = v.value
                    break
            }
        }

        return data
    })

    Object.assign(defaultInfo, inputs)
    await browser.close();
    console.log('   页面参数到手，关闭浏览器')

    console.log()
    console.log('   -------------------------------------   ')
    console.log('                请求扫码')
    console.log('   -------------------------------------   ')
    console.log()

}).then(() => {
    return requestScan()
}).then(() => {
    return listenScan()
}).then(ticket => {
    defaultInfo.trackid = ticket
    return login(ticket)
}).then(() => {
    console.log('   登录成功')
    return runGoodSearch()
}).then(() => {
    return addCart()
}).then(() => {
    return isBuy ? buy() : ''

})

// 请求扫码
async function requestScan() {
    const result = await request({
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

    defaultInfo.cookies = cookieParser(result.headers['set-cookie'])
    defaultInfo.cookieData = result.headers['set-cookie'];
    const image_file = result.data;

    await writeFile('qr.png', image_file)
}

async function writeFile(fileName, file) {
    return await new Promise((resolve, reject) => {
        fs.writeFile(fileName, file, 'binary', err => {
            opn('qr.png')
            resolve()
        })
    })
}

// 监听扫码状态
async function listenScan() {

    let flag = true
    let ticket

    while (flag) {
        const callback = {}
        let name;
        callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
            console.log(`   ${data.msg || '扫码成功，正在登录'}`)
            if (data.code === 200) {
                flag = false;
                ticket = data.ticket
            }
        }

        const result = await request({
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
        })

        eval('callback.' + result.data);
        await sleep(1000)
    }

    return ticket
}

// 开始登录
async function login(ticket) {
    const result = await request({
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
    })

    defaultInfo.header['p3p'] = result.headers['p3p']
    return defaultInfo.cookieData = result.headers['set-cookie']
}

// 商品信息
function goodInfo(goodId) {

    const stockLink = `http://item.jd.com/${goodId}.html`

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
async function goodPrice(stockId) {
    const callback = {}
    let name;
    let price;

    callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
        price = data
    }

    const result = await request({
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
    })

    eval('callback.' + result.data)

    return price
}

// 商品状态
async function goodStatus(goodId, areaId) {
    const callback = {}
    let name;
    let status

    callback[name = ('jQuery' + getRandomInt(100000, 999999))] = data => {
        status = data[goodId]
    }

    const result = await request({
        method: 'get',
        url: 'http://c0.3.cn/stocks',
        headers: Object.assign(defaultInfo.header, {
            cookie: defaultInfo.cookieData.join('')
        }),
        params: {
            type: 'getstocks',
            area: areaId,
            skuIds: goodId,
            callback: name,
        },
        responseType: 'arraybuffer'
    })

    const data = iconv.decode(result.data, 'gb2312')
    eval('callback.' + data)

    return status
}

// 无货商品状态轮训
async function runGoodSearch() {

    let flag = true

    while (flag) {
        const all = await Promise.all([goodPrice(defaultInfo.goodId), goodStatus(defaultInfo.goodId, defaultInfo.areaId), goodInfo(defaultInfo.goodId)])

        const body = $.load(iconv.decode(all[2].data, 'gb2312'))
        outData.name = body('div.sku-name').text().trim()
        const cartLink = body('a#InitCartUrl').attr('href')
        outData.cartLink = cartLink ? 'http:' + cartLink : '无购买链接'
        outData.price = all[0][0].p
        outData.stockStatus = all[1]['StockStateName']
        outData.time = formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss')

        console.log()
        console.log(`   商品详情------------------------------`)
        console.log(`   时间：${outData.time}`)
        console.log(`   商品名：${outData.name}`)
        console.log(`   价格：${outData.price}`)
        console.log(`   状态：${outData.stockStatus}`)
        console.log(`   商品连接：${outData.link}`)
        console.log(`   购买连接：${outData.cartLink}`)

        const statusCode = all[1]['StockState']
        // 如果有货就下单
        // 33 有货  34 无货
        if (+statusCode === 33) {
            flag = false
        } else {
            await sleep(defaultInfo.time)
        }
    }
}

// 加入购物车
async function addCart() {
    console.log()
    console.log('   开始加入购物车')

    const result = await request({
        method: 'get',
        url: outData.cartLink,
        headers: Object.assign(defaultInfo.header, {
            cookie: defaultInfo.cookieData.join('')
        }),
    })

    const body = $.load(result.data)

    const addCartResult = body('h3.ftx-02')

    if (addCartResult) {
        console.log(`   ${addCartResult.text()}`)
    } else {
        console.log('   添加购物车失败')
    }
}

// 下单
async function buy() {
    const orderInfo = await request({
        method: 'get',
        url: 'http://trade.jd.com/shopping/order/getOrderInfo.action',
        headers: Object.assign(defaultInfo.header, {
            cookie: defaultInfo.cookieData.join('')
        }),
        params: {
            rid: new Date().getTime(),
        },
        responseType: 'arraybuffer'
    })

    const body = $.load(orderInfo.data)
    const payment = body('span#sumPayPriceId').text().trim()
    const sendAddr = body('span#sendAddr').text().trim()
    const sendMobile = body('span#sendMobile').text().trim()

    console.log()
    console.log(`   订单详情------------------------------`)
    console.log(`   订单总金额：${payment}`)
    console.log(`   ${sendAddr}`)
    console.log(`   ${sendMobile}`)
    console.log()

    console.log('   开始下单')

    const result = await request({
        method: 'post',
        url: 'http://trade.jd.com/shopping/order/submitOrder.action',
        headers: Object.assign(defaultInfo.header, {
            cookie: defaultInfo.cookieData.join('')
        }),
        params: {
            'overseaPurchaseCookies': '',
            'submitOrderParam.btSupport': '1',
            'submitOrderParam.ignorePriceChange': '0',
            'submitOrderParam.sopNotPutInvoice': 'false',
            'submitOrderParam.trackID': defaultInfo.ticket,
            'submitOrderParam.eid': defaultInfo.eid,
            'submitOrderParam.fp': defaultInfo.fp,
        },
    })

    if (result.data.success) {
        console.log(`   下单成功,订单号${result.data.orderId}`)
        console.log('请前往京东商城及时付款，以免订单超时取消')
    } else {
        console.log(`   下单失败,${result.data.message}`)
    }
}

// cookie 解析
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

// 获取一个范围的随机数
function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

//格式化日期
function formatDate(date, fmt) {
    const o = {
        "y+": date.getFullYear(),
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S+": date.getMilliseconds() //毫秒
    };
    for (let k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            if (k == "y+") {
                fmt = fmt.replace(RegExp.$1, ("" + o[k]).substr(4 - RegExp.$1.length));
            } else if (k == "S+") {
                var lens = RegExp.$1.length;
                lens = lens == 1 ? 3 : lens;
                fmt = fmt.replace(RegExp.$1, ("00" + o[k]).substr(("" + o[k]).length - 1, lens));
            } else {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
        }
    }
    return fmt;
}


// 睡眠，比setTimeout好，防止网络条件不好造成多次请求
function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}