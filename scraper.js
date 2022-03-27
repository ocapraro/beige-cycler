import puppeteer from "puppeteer-extra";
import userAgent from "user-agents";
import dotenv from "dotenv";
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

// Load environment vars
dotenv.config();

// add recaptcha plugin and provide it your 2captcha token (= their apiKey)
// 2captcha is the builtin solution provider but others would work as well.
// Please note: You need to add funds to your 2captcha account for this to work
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.TOKEN
    },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

const changePFP = async(page) => {
  console.log("Opening file popup");
  await page.waitForSelector('.fileInput-1LZSb9',{timeout:6000});
  await page.evaluate(() => {
    document.querySelector('.fileInput-1LZSb9').click();
  });
  console.log("Uploading picture");
  await page.waitForTimeout(300);
  await page.waitForSelector('.file-input',{timeout:6000});
  const inputUploadHandle = await page.$('.file-input');
  let fileToUpload = 'tmp/pfp.png';
  inputUploadHandle.uploadFile(fileToUpload);
  console.log("Resizing");
  await page.waitForSelector('.fullscreenOnMobile-ixj0e3 .lookFilled-yCfaCM',{timeout:6000});
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.querySelector('.fullscreenOnMobile-ixj0e3 .lookFilled-yCfaCM').click();
  });
  
  console.log("Submitting");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.querySelector('.noticeRegion-qjyUVg .colorGreen-3y-Z79').click();
  });

  await page.waitForTimeout(3000);
  let customChildren = await page.evaluate(() => {
    return document.querySelector('.customizationSection-IGy2fS').children.length;
  });

  if(customChildren!=2){
    console.log("Failed... Restarting","\n");
    await page.waitForTimeout(500);
    await changePFP(page);
  }else{
    console.log("Success!");
  }
};

export async function scrapeTest(aboutMe) {
  const browser = await puppeteer.launch( { headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(userAgent.toString())
    
  await page.goto('https://discord.com/login');
  
  await page.type('[name=email]', process.env.EMAIL);

  await page.type('[name=password]', process.env.PASSWORD);

  await page.click('[type=submit]');

  console.log('Waiting for captchas to be ready.');
  await page.waitForSelector('iframe');
  console.log('Captchas are ready');

  const elementHandle = await page.$(
      'iframe',
  );
  const frame = await elementHandle.contentFrame();

  console.log("Solving captchas...");
  console.time('Time elapsed');
  await frame.waitForSelector('#checkbox',{timeout:10000});
  await page.solveRecaptchas();
  console.timeEnd('Time elapsed');
  console.log("Navigating to settings");
  await page.waitForSelector('[aria-label="User Settings"]',{timeout:6000});
  await page.evaluate(() => {
    document.querySelector('[aria-label="User Settings"]').click();
  });
  console.log("Accessing profile");
  await page.waitForSelector('.userInfo-regn9W .button-f2h6uQ',{timeout:6000});
  await page.evaluate(() => {
    document.querySelector('.userInfo-regn9W .button-f2h6uQ').click();
  });
  
  await changePFP(page);  

  await page.screenshot({path:'tmp/test2.png'});

  await browser.close();
  
}