/* Browser regression checks for the WordBloom Tests experience. */
const { chromium } = require(
  process.env.WORDBLOOM_PLAYWRIGHT || "@playwright/test"
)
const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const path = require("node:path")
const http = require("node:http")
const root = path.resolve(__dirname, "..")
const output = process.env.WORDBLOOM_OUTPUT || path.join(__dirname, "output")
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname
      ),
      filename = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname)
      )
    if (filename !== root && !filename.startsWith(root + path.sep))
      throw Error("Path outside app")
    const bytes = await fs.readFile(filename)
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".jpg": "image/jpeg",
      }[path.extname(filename)] || "application/octet-stream"
    )
    res.end(bytes)
  } catch {
    res.statusCode = 404
    res.end("Not found")
  }
})

;(async () => {
  await fs.mkdir(output, { recursive: true })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const url = `http://127.0.0.1:${server.address().port}/`
  const browser = await chromium.launch({ headless: true })
  const results = []
  async function scenario(name, fn) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    })
    await context.addInitScript(() => {
      window.__spoken = []
      const original = window.speechSynthesis?.speak?.bind(window.speechSynthesis)
      if (original)
        window.speechSynthesis.speak = (utterance) => {
          window.__spoken.push(utterance.text)
          original(utterance)
        }
    })
    const page = await context.newPage(),
      errors = []
    page.setDefaultTimeout(10000)
    page.on("pageerror", (error) => errors.push(error.message))
    try {
      await page.goto(url)
      await page.locator('[data-nav="test"]').waitFor()
      await fn(page)
      assert.deepEqual(errors, [])
      console.log("PASS " + name)
      results.push({ name, passed: true })
    } catch (error) {
      results.push({ name, passed: false, error: error.message, errors })
      console.error("FAIL " + name + ": " + error.message)
      await page
        .screenshot({
          path: path.join(
            output,
            name.replace(/[^a-z0-9]+/gi, "-") + "-failure.png"
          ),
          fullPage: true,
        })
        .catch(() => {})
    } finally {
      await context.close()
    }
  }
  const waitIdle = (page) => page.waitForFunction(() => !busy)
  async function next(page) {
    const button = page.locator('.question-bottom [data-action="next"]')
    assert.equal(await button.isEnabled(), true)
    await button.click()
    await waitIdle(page)
  }
  async function answer(page, { wrong = false } = {}) {
    const task = await page.evaluate(() => {
      const t = state.session.tasks[state.session.index]
      return { kind: t.kind, word: t.word.word }
    })
    if (task.kind === "builder") {
      const ids = await page.evaluate((wrong) => {
        const word = state.session.tasks[state.session.index].word.word.toUpperCase()
        const target = wrong ? word.slice(1) + word[0] : word
        const used = new Set()
        return [...target].map((char) => {
          const letter = ui.letters.find(
            (item) => item.letter === char && !used.has(item.id)
          )
          if (!letter) throw Error("Could not build expected word")
          used.add(letter.id)
          return letter.id
        })
      }, wrong)
      for (const id of ids) {
        await page.locator(`[data-action="add-letter"][data-id="${id}"]`).click()
        await waitIdle(page)
      }
      if (
        (await page.evaluate(() => state.session.mode)) !== "test-builder"
      ) {
        await page.locator('[data-action="submit-builder"]').click()
        await waitIdle(page)
      }
    } else if (["write", "listen-write"].includes(task.kind)) {
      await page.locator("#answer").fill(wrong ? "not the answer" : task.word)
      await page.locator(".answer-submit").click()
      await waitIdle(page)
    } else {
      const index = await page.evaluate((wrong) => {
        const t = state.session.tasks[state.session.index]
        return ui.options.findIndex((option) => {
          const value = typeof option === "string" ? option : option.word
          return WordBloom.correct(t.word, value) !== wrong
        })
      }, wrong)
      assert.notEqual(index, -1)
      await page
        .locator(`[data-action="answer-choice"][data-index="${index}"]`)
        .click()
      await waitIdle(page)
    }
    await page.waitForFunction(
      () => ui.feedback && !ui.feedback.response.secondChance
    )
  }
  async function complete(page) {
    for (let i = 0; i < 60; i++) {
      if (await page.evaluate(() => state.session.finished)) return
      await answer(page)
      await next(page)
    }
    throw Error("Test did not finish within 60 questions")
  }
  async function start(page, mode) {
    if (!(await page.locator(`[data-mode="${mode}"]`).count())) {
      await page.locator('.results [data-action="home"]').click()
      await waitIdle(page)
    }
    await page.locator(`[data-mode="${mode}"]`).click()
    await waitIdle(page)
    assert.equal(await page.evaluate(() => state.session.mode), mode)
  }

  await scenario("Tests home and responsive tile layout", async (page) => {
    assert.equal(await page.locator('[data-nav="test"]').innerText(), "Tests")
    assert.equal(await page.locator("[data-nav=home]").count(), 0)
    assert.equal(await page.locator("[data-nav=review]").count(), 0)
    assert.equal(await page.locator("#startBucket").count(), 1)
    assert.equal(await page.locator(".test-tile").count(), 5)
    assert.equal(await page.getByText("Let’s collect your team.").count(), 1)
    assert.equal(await page.getByText("Weekly plan", { exact: false }).count(), 0)
    assert.equal(await page.getByText("Turn a card", { exact: false }).count(), 0)
    assert.equal(await page.locator(".test-tile").filter({ hasText: "Example:" }).count(), 5)
    assert.equal(await page.getByText("Earn 20%", { exact: true }).count(), 2)
    assert.equal(await page.getByText("Earn 30%", { exact: true }).count(), 2)
    assert.equal(await page.getByText("Earn 60%", { exact: true }).count(), 1)
    for (const tile of await page.locator(".test-tile").all()) {
      assert.equal(await tile.locator("h3").evaluate((el) => getComputedStyle(el).whiteSpace), "nowrap")
      const aligned = await tile.evaluate((el) => {
        const icon = el.querySelector(".tile-symbol").getBoundingClientRect()
        const copy = el.querySelector(".test-tile-copy").getBoundingClientRect()
        return Math.abs(icon.top + icon.height / 2 - (copy.top + copy.height / 2))
      })
      assert.ok(aligned < 2)
      assert.ok(await tile.locator(".test-tile-history").count())
    }
    const rewardStyle = await page.locator(".test-tile-reward").first().evaluate((el) => getComputedStyle(el))
    assert.equal(rewardStyle.fontSize, "9px")
    assert.equal(rewardStyle.backgroundColor, "rgb(45, 102, 83)")
    const historyStyle = await page.locator(".test-tile-history").first().evaluate((el) => ({
      color: getComputedStyle(el).color,
      fontSize: getComputedStyle(el).fontSize,
      fontFamily: getComputedStyle(el).fontFamily,
      fontStyle: getComputedStyle(el).fontStyle,
      fontWeight: getComputedStyle(el).fontWeight,
      align: getComputedStyle(el.parentElement).textAlign,
    }))
    assert.equal(historyStyle.color, "rgb(45, 102, 83)")
    assert.equal(historyStyle.fontSize, "10px")
    assert.match(historyStyle.fontFamily, /Georgia/)
    assert.equal(historyStyle.fontStyle, "normal")
    assert.equal(historyStyle.fontWeight, "600")
    assert.equal(historyStyle.align, "right")
    assert.equal(await page.getByText("Daily Challenge", { exact: true }).count(), 0)
    assert.equal(await page.getByText("You have a little practice to finish.").count(), 0)
    await page.screenshot({ path: path.join(output, "tests-desktop.png"), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
    await page.screenshot({ path: path.join(output, "tests-mobile.png"), fullPage: true })
  })

  await scenario("A test is gently locked for 15 minutes after eleven completions", async (page) => {
    await page.evaluate(() => {
      const bucket = state.buckets.find((item) => item.words.length)
      ui.selected = bucket.id
      state.attempts = Array.from({ length: 11 }, (_, i) => ({
        id: `lock-test-${i}`,
        bucketId: bucket.id,
        bucketName: bucket.name,
        type: "test",
        date: new Date(Date.now() - (11 - i) * 60000).toISOString(),
        score: 1,
        responses: [{}],
      }))
      renderTestStart()
    })
    await page.locator('.test-tile[data-mode="test"]').click()
    assert.equal(await page.getByText(/You’ve completed this test 11 times\. Choose another test/).count(), 1)
    assert.equal(await page.locator('.test-tile[data-mode="test"]').isDisabled(), true)
    assert.match(await page.locator('.test-tile[data-mode="test"]').innerText(), /Locked for 15 min/)
    await page.reload()
    await page.locator('[data-nav="test"]').waitFor()
    assert.equal(await page.locator('.test-tile[data-mode="test"]').isDisabled(), true)
  })

  await scenario("Automatic speech prefers an enhanced English voice", async (page) => {
    const selected = await page.evaluate(() => {
      state.settings.voiceURI = ""
      return preferredVoice([
        { voiceURI: "uk-standard", name: "Standard UK", lang: "en-GB", localService: true, default: true },
        { voiceURI: "us-natural", name: "Natural Voice", lang: "en-US", localService: false, default: false },
      ])?.name
    })
    assert.equal(selected, "Natural Voice")
  })

  await scenario("Look & Write adds 60% and explains the remaining card progress", async (page) => {
    await start(page, "test")
    await complete(page)
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 60)
    assert.equal(await page.getByText(/You earned 60%.*You need 40% more/).count(), 1)
    assert.equal(await page.locator(".reward-options [data-action=claim-player]").count(), 0)
    assert.equal(await page.evaluate(() => WordBloom.football.ownedIds(state.football).length), 0)
  })

  await scenario("Listen & Write waits for input and adds 30 percent", async (page) => {
    await start(page, "test-listen")
    const input = page.locator("#answer")
    assert.equal(await input.getAttribute("aria-invalid"), null)
    assert.equal(await input.evaluate((el) => el.matches(":invalid")), false)
    assert.equal(await input.evaluate((el) => getComputedStyle(el).borderTopColor), "rgb(204, 215, 198)")
    await page.locator(".answer-submit").click()
    assert.equal(await page.evaluate(() => state.session.index), 0)
    assert.equal(await page.evaluate(() => !!ui.feedback?.response), false)
    const word = await page.evaluate(() => state.session.tasks[0].word.word)
    await input.fill(word)
    await input.press("Enter")
    await waitIdle(page)
    await page.waitForFunction(() => ui.feedback?.response)
    await next(page)
    await complete(page)
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 30)
    assert.equal(await page.getByText(/You earned 30%.*You need 70% more/).count(), 1)
    assert.equal(await page.locator(".reward-options [data-action=claim-player]").count(), 0)
    await page.locator('.results [data-action="home"]').click()
    await waitIdle(page)
    const tile = page.locator('.test-tile[data-mode="test-listen"]')
    assert.match(await tile.locator(".test-tile-history").innerText(), /1 test/)
    assert.equal(await tile.locator(".test-tile-perfect").count(), 1)
  })

  await scenario("choice test adds 20 percent", async (page) => {
    await start(page, "test-find")
    assert.equal(await page.locator(".prompt-picture .question-image").count(), 1)
    assert.equal(
      await page.evaluate(() => window.__spoken.includes(state.session.tasks[0].word.definition)),
      true
    )
    await complete(page)
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 20)
    assert.equal(await page.getByText(/You earned 20%.*You need 80% more/).count(), 1)
    assert.equal(await page.locator(".reward-options [data-action=claim-player]").count(), 0)
  })

  await scenario("letter test auto-checks inline and carries progress to a card", async (page) => {
    await start(page, "test-builder")
    await answer(page, { wrong: true })
    assert.equal(await page.evaluate(() => ui.feedback.response.correct), false)
    assert.equal(await page.locator("#resultDialog[open]").count(), 0)
    assert.equal(await page.locator('.question-bottom [data-action="next"]').isEnabled(), true)
    await next(page)
    await complete(page)
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 30)
    for (let run = 0; run < 3; run++) {
      await start(page, "test-builder")
      await complete(page)
    }
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 20)
    assert.equal(await page.locator(".reward-options [data-action=claim-player]").count(), 3)
  })

  await scenario("Read & Choose is available and adds 20 percent", async (page) => {
    await start(page, "definition")
    assert.equal(
      await page.evaluate(() => window.__spoken.includes(state.session.tasks[0].word.definition)),
      true
    )
    await complete(page)
    assert.equal(await page.evaluate(() => state.football.rewardPercent), 20)
  })

  await scenario("starting another test replaces unfinished work", async (page) => {
    await start(page, "test")
    await page.locator('[data-action="pause"]').click()
    await waitIdle(page)
    assert.equal(await page.evaluate(() => state.session), null)
    await start(page, "test-find")
    assert.equal(await page.locator("dialog[open]").count(), 0)
    assert.equal(await page.evaluate(() => state.session.mode), "test-find")
    assert.equal(await page.evaluate(() => state.session.index), 0)
  })

  await scenario("browser Back from a test returns to the Tests page", async (page) => {
    const originalPath = new URL(page.url()).pathname
    await start(page, "test")
    await page.evaluate(() => history.back())
    await page.waitForFunction(() => ui.view === "test-home" && !state.session)
    assert.equal(new URL(page.url()).pathname, originalPath)
    assert.equal(await page.locator(".test-tiles").count(), 1)
  })

  await scenario("all dialogs open in the center of the window", async (page) => {
    await page.locator('[data-action="about"]').click()
    const box = await page.locator("#modal").boundingBox()
    const viewport = page.viewportSize()
    assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2)
    assert.ok(Math.abs(box.y + box.height / 2 - viewport.height / 2) < 2)
    await page.keyboard.press("Escape")
  })

  await scenario("Look & Write waits for submit before showing validation", async (page) => {
    await start(page, "test")
    const input = page.locator("#answer")
    assert.equal(await input.getAttribute("aria-invalid"), null)
    assert.equal(await input.evaluate((el) => el.matches(":invalid")), false)
    assert.equal(await input.evaluate((el) => getComputedStyle(el).borderTopColor), "rgb(204, 215, 198)")
    await page.locator(".answer-submit").click()
    assert.equal(await input.getAttribute("aria-invalid"), "true")
    await input.fill("example")
    assert.equal(await input.getAttribute("aria-invalid"), null)
    await input.press("Enter")
    await waitIdle(page)
    assert.equal(await page.evaluate(() => !!ui.feedback?.response), true)
    assert.equal(await page.locator("#resultDialog[open]").count(), 0)
  })

  await scenario("fox celebrates correct answers and misses incorrect ones", async (page) => {
    await start(page, "test")
    await answer(page, { wrong: true })
    assert.equal(await page.locator(".shot-scene.is-miss").count(), 1)
    await page.locator('[data-action="pause"]').click()
    await waitIdle(page)
    await start(page, "test")
    await answer(page)
    assert.equal(await page.locator(".shot-scene.is-goal").count(), 1)
  })

  await browser.close()
  await new Promise((resolve) => server.close(resolve))
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(results, null, 2) + "\n"
  )
  if (results.some((result) => !result.passed)) process.exitCode = 1
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
  server.close()
})
