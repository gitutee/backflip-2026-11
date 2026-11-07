const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")
const C = require("../core.js")
const sandbox = { window: {} }
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../seed.js"), "utf8"),
  sandbox
)
const original = JSON.parse(JSON.stringify(sandbox.window.WORDBLOOM_SEED))
const fresh = () => C.decodeBackup(original)
const firstShuffleChoice = (players, id) => {
  let i = players.length - 1
  return () => {
    const current = i--
    return current === players.findIndex((player) => player.id === id)
      ? 0
      : 0.999999
  }
}

test("original words, pictures and screenshots migrate without embedded history images", () => {
  const data = fresh()
  assert.equal(
    data.state.buckets.reduce((n, b) => n + b.words.length, 0),
    19
  )
  assert.equal(data.assets.length, 15)
  C.checkReferences(data.state, data.assets)
  assert.ok(!JSON.stringify(data.state).includes("base64"))
  assert.equal(data.state.settings.activeBucketId, "clothes-2026-11-04")
})
test("synonyms never appear as competing answers", () => {
  const b = fresh().state.buckets.find((b) => b.id === "starter")
  for (const w of b.words)
    for (let i = 0; i < 100; i++) {
      const options = C.choices(w, b)
      assert.equal(options.filter((x) => C.correct(w, x)).length, 1)
      assert.equal(new Set(options.map(C.norm)).size, options.length)
    }
  const w = b.words.find((w) => w.word === "next to")
  for (let i = 0; i < 100; i++)
    assert.ok(!C.pictureChoices(w, b).some((x) => x.word === "beside"))
})
test("60 writing tests keep image references compact", () => {
  const { state } = fresh()
  for (let n = 0; n < 60; n++) {
    C.launch(state, "test", state.settings.activeBucketId)
    while (!state.session.finished)
      C.answer(state, state.session.tasks[state.session.index].word.word)
  }
  assert.equal(state.attempts.length, 60)
  assert.ok(JSON.stringify(state).length < 500000)
  assert.ok(!JSON.stringify(state.attempts).includes("base64"))
  assert.equal(C.normalizeState(state).attempts.length, 60)
})
test("answer checkpoint survives a reload and resumes at next unanswered task", () => {
  const { state } = fresh()
  C.launch(state, "mission", state.settings.activeBucketId)
  C.answer(state, state.session.tasks[0].word.word)
  C.answer(state, state.session.tasks[1].word.word)
  const restored = C.normalizeState(JSON.parse(JSON.stringify(state)))
  assert.equal(restored.session.index, 2)
  assert.equal(restored.session.records.length, 2)
  assert.equal(
    restored.session.tasks[2].word.word,
    state.session.tasks[2].word.word
  )
})
test("three sessions in one day do not create mastery", () => {
  const { state } = fresh(),
    b = state.buckets[0],
    w = b.words[0]
  for (let i = 0; i < 5; i++) C.record(state, b.id, w, w.word, false)
  assert.equal(C.progress(state, b.id, w.id).streak, 1)
  assert.equal(C.progress(state, b.id, w.id).status, "Learning")
})
test("missing weekly configuration is safe and valid", () => {
  const { state } = fresh()
  state.weeks = {}
  assert.equal(
    C.normalizeState(state).settings.activeBucketId,
    state.settings.activeBucketId
  )
})
test("malformed legacy history rejects entire incoming document", () => {
  const { state } = fresh(),
    before = JSON.stringify(state)
  assert.throws(
    () =>
      C.decodeBackup({
        buckets: original.buckets,
        learning: { attempts: null },
      }),
    /history/
  )
  assert.equal(JSON.stringify(state), before)
})
test("restore really restores edits for an existing word ID", () => {
  const data = fresh()
  data.state.buckets[0].words[0].definition = "The restored definition."
  const restored = C.decodeBackup({
    format: "wordbloom-v3",
    ...{ state: data.state, assets: data.assets },
  })
  assert.equal(
    restored.state.buckets[0].words[0].definition,
    "The restored definition."
  )
})
test("merge keeps local existing entries and adds missing ones", () => {
  const current = fresh(),
    incoming = fresh()
  incoming.state.buckets[0].words[0].definition = "remote change"
  incoming.state.buckets[0].words.push({
    id: "new",
    word: "flower",
    definition: "A colourful part of a plant.",
    choices: [],
    aliases: [],
  })
  const merged = C.mergeData(current.state, incoming, current.assets)
  assert.notEqual(merged.state.buckets[0].words[0].definition, "remote change")
  assert.ok(merged.state.buckets[0].words.some((w) => w.id === "new"))
})
test("backup missing picture content is rejected before saving", () => {
  const data = fresh()
  assert.throws(
    () =>
      C.decodeBackup({ format: "wordbloom-v3", state: data.state, assets: [] }),
    /missing/
  )
})
test("duplicate word identifiers cannot corrupt progress", () => {
  const broken = structuredClone(original)
  broken.buckets[0].words.push({ ...broken.buckets[0].words[0] })
  assert.throws(() => C.decodeBackup(broken), /Duplicate word ID/)
})
test("invalid schedules and progress are rejected", () => {
  const { state } = fresh()
  state.weeks[state.settings.activeBucketId] = {
    startDate: "2026-02-30",
    testDate: "2026-03-01",
    learningDays: [1],
  }
  assert.throws(() => C.normalizeState(state), /schedule/)
  delete state.weeks[state.settings.activeBucketId]
  state.progress["bad"] = { status: "MadeUp" }
  assert.throws(() => C.normalizeState(state), /status/)
})
test("no audio gives a written task, never an impossible listening task", () => {
  const { state } = fresh()
  C.launch(state, "mission", state.settings.activeBucketId, { audio: false })
  assert.ok(state.session.tasks.every((t) => t.kind !== "listen"))
})
test("two wrong practice tries queue one later retry, tests never grow", () => {
  const { state } = fresh()
  C.launch(state, "builder", state.settings.activeBucketId)
  const count = state.session.tasks.length
  const first = C.answer(state, "not correct")
  assert.ok(first.secondChance)
  assert.equal(state.session.index, 0)
  C.answer(state, "still not correct")
  assert.equal(state.session.tasks.length, count + 1)
  C.launch(state, "test", state.settings.activeBucketId)
  const originalCount = state.session.tasks.length
  C.answer(state, "not correct")
  assert.equal(state.session.tasks.length, originalCount)
})
test("legacy completed mission dates remain visible after conversion", () => {
  const data = {
    ...structuredClone(original),
    learning: {
      activeBucketId: "starter",
      weeks: {},
      progress: {},
      attempts: [],
      events: [],
      missions: {
        "starter:2026-11-04": {
          date: "2026-11-04",
          completedAt: "2026-11-04T12:00:00Z",
        },
      },
    },
  }
  assert.ok(C.decodeBackup(data).state.missions[C.key("starter", "2026-11-04")])
})
test("flashcard exposure persists and is not counted twice when advancing", () => {
  const { state } = fresh()
  C.launch(state, "cards", state.settings.activeBucketId)
  const s = state.session,
    t = s.tasks[0]
  C.record(state, s.bucketId, t.word, "", false, true)
  t.exposed = true
  const restored = C.normalizeState(state)
  assert.ok(restored.session.tasks[0].exposed)
  C.answer(restored, t.word.word)
  assert.equal(C.progress(restored, s.bucketId, t.word.id).seen, 1)
})

test("reverse aliases are not offered as competing choices", () => {
  const w = {
      id: "a",
      word: "beside",
      definition: "next to something",
      aliases: [],
      choices: [],
    },
    other = {
      id: "b",
      word: "next to",
      definition: "beside something",
      aliases: ["beside"],
      choices: [],
    }
  for (let i = 0; i < 100; i++)
    assert.ok(!C.choices(w, { words: [w, other] }).includes("next to"))
})
test("reserved object keys in imported identifiers are rejected", () => {
  const data = fresh()
  data.state.buckets[0].id = "__proto__"
  assert.throws(() => C.normalizeState(data.state), /reserved/)
})

test("all five tests retain their type in saved and restored history", () => {
  for (const [mode, kind] of [
    ["test-listen", "listen-write"],
    ["test", "write"],
    ["test-builder", "builder"],
    ["test-find", "definition"],
    ["definition", "definition"],
  ]) {
    const { state } = fresh()
    C.launch(state, mode, state.settings.activeBucketId)
    assert.ok(state.session.tasks.every((t) => t.kind === kind))
    const restored = C.normalizeState(state)
    assert.equal(restored.session.mode, mode)
    while (!restored.session.finished)
      C.answer(
        restored,
        restored.session.tasks[restored.session.index].word.word
      )
    const roundTrip = C.normalizeState(restored)
    assert.equal(roundTrip.attempts[0].type, mode)
    assert.equal(roundTrip.attempts[0].score, 10)
  }
})
test("listening-only tests require usable audio instead of exposing a written answer", () => {
  const { state } = fresh()
  assert.throws(
    () =>
      C.launch(state, "test-listen", state.settings.activeBucketId, {
        audio: false,
      }),
    /Audio is unavailable/
  )
  assert.equal(state.session, null)
})
test("letter-building test keeps first attempt scoring and does not append retries", () => {
  const { state } = fresh()
  C.launch(state, "test-builder", state.settings.activeBucketId)
  const count = state.session.tasks.length
  C.answer(state, "wrong")
  assert.equal(state.session.tasks.length, count)
  while (!state.session.finished)
    C.answer(state, state.session.tasks[state.session.index].word.word)
  assert.equal(state.attempts[0].score, count - 1)
})
test("voice preference and bounded speaking rate survive backup normalization", () => {
  const { state } = fresh()
  state.settings.voiceURI = "local-English-enhanced"
  state.settings.speechRate = 0.7
  const restored = C.normalizeState(state)
  assert.equal(restored.settings.voiceURI, "local-English-enhanced")
  assert.equal(restored.settings.speechRate, 0.7)
  state.settings.speechRate = 99
  assert.equal(C.normalizeState(state).settings.speechRate, 1.1)
})

test("football catalog has 48 distinct players and balanced positions", () => {
  const F = C.football
  assert.equal(F.players.length, 48)
  assert.equal(new Set(F.players.map((p) => p.id)).size, 48)
  assert.equal(F.byId["emi-martinez"].name, "Emiliano Martínez")
  assert.equal(F.byId["emi-martinez"].role, "GK")
  for (const role of ["GK", "DF", "MF", "FW"])
    assert.ok(F.players.filter((p) => p.role === role).length >= 6)
})
test("old saved state upgrades without losing word progress or inventing players", () => {
  const { state } = fresh()
  delete state.football
  const w = state.buckets[0].words[0]
  C.record(state, state.buckets[0].id, w, w.word, false)
  const oldProgress = structuredClone(state.progress)
  const upgraded = C.normalizeState(state)
  assert.deepEqual(upgraded.progress, oldProgress)
  assert.deepEqual(C.football.ownedIds(upgraded.football), [])
})
test("reward choices are randomized, unique and avoid the previous offer when possible", () => {
  const F = C.football,
    data = F.fresh(),
    reward = F.earn(data, "2026-11-05", "2026-11-08", () => 0.25)
  assert.equal(reward.options.length, 3)
  assert.equal(new Set(reward.options).size, 3)
  assert.ok(reward.options.every((id) => F.byId[id]))
  assert.equal(F.earn(data, "2026-11-05", "2026-11-09"), null)
  const next = F.earn(data, "2026-11-06", "2026-11-08", () => 0.75)
  assert.ok(next.options.every((id) => !reward.options.includes(id)))
  assert.equal(data.rewards.length, 2)
})
test("claim is final, puts goalkeeper in goal and rejects a second choice", () => {
  const F = C.football,
    data = F.fresh(),
    r = F.earn(data, "2026-11-05", "2026-11-05", firstShuffleChoice(F.players, "emi-martinez"))
  F.claim(data, r.id, r.options[0])
  assert.equal(data.lineup.gk, "emi-martinez")
  assert.equal(data.captain, "emi-martinez")
  assert.throws(() => F.claim(data, r.id, "ronaldo"), /no longer/)
})
test("every one of the 48 players can be collected without duplicates", () => {
  const F = C.football,
    data = F.fresh()
  for (let i = 0; i < 48; i++) {
    const day = C.addDays("2026-01-01", i),
      r = F.earn(data, day, day, () => 0.4)
    assert.ok(r)
    assert.ok(r.options.every((id) => !F.ownedIds(data).includes(id)))
    F.claim(data, r.id, r.options[0])
    F.normalize(data)
  }
  assert.equal(F.ownedIds(data).length, 48)
  assert.equal(new Set(F.ownedIds(data)).size, 48)
  assert.equal(F.earn(data, "2026-05-01"), null)
})
test("unclaimed rewards remain available and reserve distinct players", () => {
  const F = C.football,
    data = F.fresh()
  const a = F.earn(data, "2026-11-05"),
    b = F.earn(data, "2026-11-06")
  assert.equal(a.options.filter((id) => b.options.includes(id)).length, 0)
  const restored = F.normalize(JSON.parse(JSON.stringify(data)))
  assert.equal(F.pending(restored).id, a.id)
})
test("lineup rejects unowned players and goalkeepers out of goal", () => {
  const F = C.football,
    data = F.fresh(),
    r = F.earn(data, "2026-11-05", "2026-11-05", firstShuffleChoice(F.players, "ronaldo"))
  F.claim(data, r.id, r.options[0])
  assert.throws(() => F.assign(data, "gk", r.options[0]), /Goalkeepers can only play in goal/)
  assert.throws(() => F.assign(data, "gk", "emi-martinez"), /collected player/)
  F.assign(data, "rw", r.options[0])
  assert.equal(data.lineup.rw, r.options[0])
  F.assign(data, "lcb", r.options[0])
  assert.equal(data.lineup.rw, undefined)
  assert.equal(data.lineup.lcb, r.options[0])
  assert.equal(
    Object.values(data.lineup).filter((id) => id === r.options[0]).length,
    1
  )
  assert.deepEqual(F.ownedIds(data), [r.options[0]])
})
test("goalkeepers can only be assigned to goal and field players can use every outfield slot", () => {
  const F = C.football,
    data = F.fresh(),
    goalkeeper = F.earn(data, "2026-11-05", "2026-11-05", firstShuffleChoice(F.players, "emi-martinez"))
  F.claim(data, goalkeeper.id, "emi-martinez")
  assert.throws(() => F.assign(data, "lcb", "emi-martinez"), /Goalkeepers can only play in goal/)
  F.assign(data, "gk", "emi-martinez")
  assert.equal(data.lineup.gk, "emi-martinez")
  const fieldPlayer = F.players.find((player) => player.role !== "GK")
  const fieldReward = F.award(data, "2026-11-06", "test", "field-player", firstShuffleChoice(F.players.filter((player) => player.id !== "emi-martinez"), fieldPlayer.id))
  F.claim(data, fieldReward.id, fieldPlayer.id)
  for (const slot of F.slots.filter((item) => item.role !== "GK")) {
    F.assign(data, slot.id, fieldPlayer.id)
    assert.equal(data.lineup[slot.id], fieldPlayer.id)
  }
  assert.throws(() => F.assign(data, "gk", fieldPlayer.id), /Goalkeepers can only play in goal/)
})
test("player collection, lineup, captain and pending choice round-trip in full backups", () => {
  const data = fresh(),
    F = C.football
  const a = F.earn(data.state.football, "2026-11-05")
  F.claim(data.state.football, a.id, a.options[0])
  F.earn(data.state.football, "2026-11-06")
  const restored = C.decodeBackup({
    format: "wordbloom-v3",
    state: data.state,
    assets: data.assets,
  })
  assert.deepEqual(restored.state.football, data.state.football)
})
test("merge preserves current captain and adds missing collected players", () => {
  const F = C.football,
    a = F.fresh(),
    b = F.fresh()
  let r = F.earn(a, "2026-11-05", "2026-11-05", firstShuffleChoice(F.players, "messi"))
  F.claim(a, r.id, r.options[0])
  const captain = r.options[0]
  r = F.earn(b, "2026-11-06", "2026-11-06", firstShuffleChoice(F.players, "emi-martinez"))
  F.claim(b, r.id, r.options[0])
  const out = F.merge(a, b)
  assert.deepEqual(new Set(F.ownedIds(out)), new Set([captain, "emi-martinez"]))
  assert.equal(out.captain, captain)
})
test("invalid duplicate ownership in a backup is rejected atomically", () => {
  const data = fresh(),
    F = C.football
  let r = F.earn(data.state.football, "2026-11-05")
  F.claim(data.state.football, r.id, r.options[0])
  data.state.football.rewards.push({
    ...structuredClone(r),
    id: "training:2026-11-06",
    earnedOn: "2026-11-06",
  })
  assert.throws(
    () =>
      C.decodeBackup({
        format: "wordbloom-v3",
        state: data.state,
        assets: data.assets,
      }),
    /collected/
  )
})
test("first practice mistake saves a hint checkpoint without advancing the question", () => {
  const { state } = fresh()
  C.launch(state, "learn", state.settings.activeBucketId)
  const r = C.answer(state, "wrong")
  assert.equal(r.secondChance, true)
  assert.equal(state.session.index, 0)
  assert.equal(state.session.records.length, 0)
  assert.equal(state.session.tasks[0].attempts, 1)
  const restored = C.normalizeState(state)
  assert.equal(restored.session.tasks[0].firstWrong, "wrong")
  const w = restored.session.tasks[0].word
  C.answer(restored, w.word)
  assert.equal(restored.session.index, 1)
  assert.equal(restored.session.records[0].firstTryCorrect, false)
  assert.equal(restored.session.records[0].firstAnswer, "wrong")
  assert.equal(C.progress(restored, restored.session.bucketId, w.id).streak, 0)
})
test("tests score the first answer immediately and never provide second chances", () => {
  for (const mode of ["test", "definition", "test-builder", "test-listen", "test-find"]) {
    const { state } = fresh()
    C.launch(state, mode, state.settings.activeBucketId)
    const r = C.answer(state, "wrong")
    assert.ok(!r.secondChance)
    assert.equal(state.session.index, 1)
    assert.equal(state.session.records[0].correct, false)
  }
})
test("test modes add their configured card progress", () => {
  const complete = (mode) => {
    const { state } = fresh()
    C.launch(state, mode, state.settings.activeBucketId, { audio: true })
    while (!state.session.finished)
      C.answer(state, state.session.tasks[state.session.index].word.word)
    return state
  }
  for (const [mode, percent] of [
    ["test", 60],
    ["test-listen", 30],
    ["test-builder", 30],
    ["definition", 20],
    ["test-find", 20],
  ]) {
    const state = complete(mode)
    assert.equal(state.football.rewardPercent, percent)
    assert.equal(C.football.pending(state.football), null)
  }
})
test("accumulated test progress creates a selectable card at 100% and keeps the remainder", () => {
  const { state } = fresh(),
    day = C.today()
  C.football.addProgress(state.football, 40, day, "test")
  C.football.addProgress(state.football, 40, day, "test")
  assert.equal(state.football.rewardPercent, 80)
  assert.equal(C.football.pending(state.football), null)
  C.football.addProgress(state.football, 40, day, "test")
  assert.equal(state.football.rewardPercent, 20)
  assert.ok(C.football.pending(state.football))
})
test("legacy Daily Challenge sessions no longer award card progress", () => {
  const { state } = fresh()
  C.launch(state, "mission", state.settings.activeBucketId)
  let guard = 100
  while (!state.session.finished && guard--) {
    const task = state.session.tasks[state.session.index]
    C.answer(state, task.attempts ? task.word.word : "wrong")
  }
  assert.ok(state.session.finished)
  assert.equal(state.football.rewards.length, 0)
  assert.equal(state.football.rewardPercent, 0)
  assert.ok(state.session.records.every((r) => !r.firstTryCorrect))
})
test("legacy Daily Challenge sessions cannot award card progress", () => {
  const { state } = fresh()
  for (const date of [
    C.today(),
    C.addDays(C.today(), 1),
    C.addDays(C.today(), 2),
  ]) {
    C.launch(state, "mission", state.settings.activeBucketId, { date })
    while (!state.session.finished)
      C.answer(state, state.session.tasks[state.session.index].word.word)
  }
  assert.equal(state.football.rewards.length, 0)
  assert.equal(state.football.rewardPercent, 0)
  assert.equal(Object.keys(state.missions).length, 3)
})

test("uncompleted challenge gives no reward and Look & Write adds 60 percent", () => {
  const { state } = fresh()
  C.launch(state, "mission", state.settings.activeBucketId)
  C.answer(state, state.session.tasks[0].word.word)
  assert.equal(state.football.rewards.length, 0)
  C.launch(state, "test", state.settings.activeBucketId)
  while (!state.session.finished)
    C.answer(state, state.session.tasks[state.session.index].word.word)
  assert.equal(state.football.rewards.length, 0)
  assert.equal(state.football.rewardPercent, 60)
})
test("merge repairs overlapping pending options without repeating collected players", () => {
  const F = C.football,
    a = F.fresh(),
    b = F.fresh()
  F.earn(a, "2026-11-05")
  const r = F.earn(b, "2026-11-06")
  const selected = r.options[0]
  F.claim(b, r.id, selected)
  const result = F.merge(a, b),
    pending = F.pending(result)
  assert.ok(pending)
  assert.ok(!pending.options.includes(selected))
  F.claim(result, pending.id, pending.options[0])
  assert.equal(new Set(F.ownedIds(result)).size, 2)
})
