import { chromium } from 'playwright'
const SP = process.env.SP
const b = await chromium.launch()
const page = await b.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:0.5, hasTouch:true })
page.on('pageerror', e => console.log('PAGEERROR', e.message))
await page.goto('http://localhost:4317/#/', { waitUntil:'networkidle' })
await page.setInputFiles('input[type=file][accept*="png"]', SP + '/photo.png')
await page.waitForTimeout(500)
console.log('buttons after file pick:')
for (const t of await page.locator('button').allInnerTexts()) console.log('  -', JSON.stringify(t.trim()))
await page.screenshot({ path: SP+'/dbg-upload.png' })
