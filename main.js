const {chromium} = require('playwright');
const child_process = require("child_process");
const fs = require("fs");

(async () => {
    async function sleep(t){
       return new Promise((r) => setTimeout(r,t*1000));
    }
    // const browser = await chromium.launch({
        // headless: false,
        // executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    // });
    // const page = await browser.newPage();    
    config = JSON.parse(fs.readFileSync("config.json"));
    child_process.exec('"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
    await sleep(3)
    const browser = await chromium.connectOverCDP("http://localhost:9222");
    const page = await browser.contexts()[0].pages()[0]

    console.log(config.url)
    await page.goto(config.url);
    
    async function init(){
        console.log(page.url());
        // await page.waitForLoadState();
        console.log((new Date()).toLocaleString())
        await page.locator('button:has-text("清晰度")').hover();
        await sleep(3);
        await page.locator(".vjs-menu-item").filter({hasText: "高清"}).click();
        await page.waitForSelector('.vjs-full-menu-text:has-text("高清")');
        await sleep(3);
        await page.locator(".vjs-mute-control").hover();
        await sleep(1);
        let volume = config.volume||50;
        let rect = await page.locator(".vjs-volume-bar").boundingBox();
        console.log(rect)
        let offset = {x:rect.width/2,y:rect.height*(1-volume/100)}
        console.log(offset)
        await page.click(".vjs-volume-bar",{position: offset});
        await sleep(1);
        if(config.fullscreen) await page.click(".vjs-fullscreen-control");
    }
    
    async function save(){
        //把音量、url、全屏信息存储        
        let update = false
        let volnow = await page.locator(".vjs-volume-bar").getAttribute("aria-valuenow");
        if(volnow != config.volume) {
            config.volume = volnow;
            update = true;
        }
        if(page.url() != config.url){
            config.url = page.url();
            update = true;
        }
        let title = await page.locator(".vjs-fullscreen-control").getAttribute("title");
        if(title == "退出全屏" && !config.fullscreen){
            config.fullscreen = true;
            update = true;
        }else if(title == "全屏" && config.fullscreen){
            config.fullscreen = false;
            update = true;
        }
        // console.log(config)
        if(update) fs.writeFileSync("config.json",JSON.stringify(config));
    }
    
    var loop = async () => {
        // console.log((new Date()).toLocaleString())
        await save()
        //点击下一集
        if(await page.locator("#html5player.vjs-ended").isVisible()){
            // clearInterval(lp)
            title = await page.locator(".vjs-fullscreen-control").getAttribute("title");
            console.log(title)
            if(title == "退出全屏") await page.click(".vjs-fullscreen-control");
            await sleep(1)
            await page.locator('.clearfix.video-item.currentplay+.clearfix.video-item').click()
            await sleep(1)
            await page.mouse.wheel(0,-400)
            await init()
            // lp = setInterval(loop,10000)
        }
        await main()
    }
    
    async function main(){
        var progress = await page.locator(".vjs-progress-holder").getAttribute("aria-valuenow");
        // console.log(progress)
        let timeout = 3;
        if(!progress){
            timeout = 10;
        }else if(Number(progress)<50){ //越接近结束，超时越短
            timeout = 180;
        }else if(Number(progress)<75){
            timeout = 60;
        }else if(Number(progress)<90){
            timeout = 20;
        }else if(Number(progress)<95){
            timeout = 10;
        }else if(Number(progress)<98){
            timeout = 6;
        }
        // console.log(timeout)
        setTimeout(loop,timeout*1000);
    }
    
    await init();
    await save();
    await main();

    // var lp = setInterval(loop,10000)

})();