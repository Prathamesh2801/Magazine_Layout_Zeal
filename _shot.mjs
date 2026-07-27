import { chromium } from 'playwright'

const SP = process.env.SP
const browser = await chromium.launch({ channel: 'chrome' })
// Portrait TV panel.
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:4317/#/tv', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)

const state = await page.evaluate(() => ({
  reel: JSON.parse(localStorage.getItem('maxter.tv.reel.v1') || '[]').length,
  status: document.querySelector('span.rounded-full')?.innerText?.trim(),
  covers: document.querySelectorAll('img[alt="Magazine cover"]').length,
  bodyScrollX: document.documentElement.scrollWidth > window.innerWidth,
}))
console.log('STATE', JSON.stringify(state))

const img = await page.locator('img[alt="Magazine cover"]').first()
if (await img.count()) {
  const box = await img.boundingBox()
  console.log('COVER BOX', JSON.stringify(box), 'ratio', (box.width / box.height).toFixed(4))
}

await page.screenshot({ path: SP + '/tv-portrait.png' })
console.log('ERRORS', JSON.stringify(errors))
await browser.close()
