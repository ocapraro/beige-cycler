import fs from "fs";
import hsl from 'hsl-to-hex';
import { scrapeTest } from "./scraper.js";
import pkg from 'convert-svg-to-png';
import express from "express";
import schedule from "node-schedule";
import dotenv from "dotenv";

/*
  TODO:
  - ~~restart on error~~
  - leave chromium open
  - better hues?
*/

// Load environment vars
dotenv.config();

const {convertFile} = pkg;
const app = express();
const port = process.env.PORT || 80;
let cycling = false;

const randRange = (min,max) => {
  const variance = 1;
  return (Math.floor((Math.random() * (max - min + 1))/variance)*variance) + min;
}

const retry = async (maxRetries, fn) => {
  return await fn().catch(async function(err) { 
    if (maxRetries <= 0) {
      next(err);
    }
    console.log(`Retrying: ${maxRetries} attempts left`);
    return await retry(maxRetries - 1, fn); 
  });
}

const generateBeige = () => {
  const hueRange = [33,43];
  const saturationRange = [70,80];
  const luminosityRange = [70,88];
  const hue = randRange(hueRange[0],hueRange[1]);
  const saturation = randRange(saturationRange[0],saturationRange[1]);
  const luminosity = randRange(luminosityRange[0],luminosityRange[1]);
  let beige = `hsl(${hue},${saturation}%,${luminosity}%)`;
  const hex = hsl(hue,saturation,luminosity).toUpperCase();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="200" height="200" viewBox="0 0 200 200">
              <rect width="100%" height="100%" fill="${beige}" rx="4.5" x="0" y="0" />
             </svg>`;
  return [svg,hex]
}

const init = async() => {
  cycling = true;
  let curBeige = generateBeige();
  fs.writeFile('tmp/pfp.svg', curBeige[0], err => {
    if (err) {
      console.error(err)
      return
    }
    //file written successfully
  });

  await (async() => {
    const inputFilePath = 'tmp/pfp.svg';
    await convertFile(inputFilePath);
  
    await retry(10, scrapeTest);
  })();
  cycling = false;
};

app.get('/cycle', async (req, res) => {
  if (cycling) {
    res.send('Already Cycling');
  }else{
    res.send('Cycling');
    await retry(10, init);
  }
})

app.get('/', async (req, res) => {
  res.send('Running');
})

app.listen(port, async () => {
  console.log("\x1b[32m%s\x1b[0m",`Server is running on port: ${port}`);
  schedule.scheduleJob('0 * * * *', async () => { 
    if (!cycling) {
      await retry(10, init);
    }
  });
})

