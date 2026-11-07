/** Shared, DOM-free learning and backup rules.
 * @spec L2-UI-69
 */
;(function (root, factory) {
  const api = factory()
  if (typeof module === "object" && module.exports) module.exports = api
  else root.WordBloom = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict"
  const F =
    typeof module === "object" && module.exports
      ? require("./football.js")
      : globalThis.BloomFootball
  const VERSION = 3
  const norm = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
  const clone = (x) => structuredClone(x)
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  const validDate = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s + "T12:00:00Z")) &&
    new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s
  const addDays = (d, n) => {
    if (!validDate(d)) throw Error("Invalid date.")
    const x = new Date(d + "T12:00:00Z")
    x.setUTCDate(x.getUTCDate() + n)
    return x.toISOString().slice(0, 10)
  }
  const key = (b, w) => JSON.stringify([b, w])
  const count = (n) => Number.isSafeInteger(n) && n >= 0
  const object = (x) => !!x && typeof x === "object" && !Array.isArray(x)
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
  const safeKey = (k) => {
    if (["__proto__", "constructor", "prototype"].includes(k))
      throw Error("Invalid reserved identifier.")
    return k
  }
  function text(x, name, max = 1000) {
    if (typeof x !== "string" || !x.trim() || x.length > max)
      throw Error("Invalid " + name + ".")
    return x.trim()
  }
  function strings(x, name) {
    if (x === undefined) return []
    if (
      !Array.isArray(x) ||
      x.length > 100 ||
      x.some((y) => typeof y !== "string" || y.length > 500)
    )
      throw Error("Invalid " + name + ".")
    return [...new Set(x.map((y) => y.trim()).filter(Boolean))]
  }
  function shuffle(a, rng = Math.random) {
    const out = [...a]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  function correct(w, answer) {
    return [w.word, ...(w.aliases || [])].some((a) => norm(a) === norm(answer))
  }
  function freshProgress() {
    return {
      seen: 0,
      correct: 0,
      mistakes: 0,
      streak: 0,
      successDays: [],
      status: "New",
      due: today(),
    }
  }
  function progress(state, bid, wid) {
    return state.progress[key(bid, wid)] || freshProgress()
  }
  function newState() {
    return {
      version: VERSION,
      settings: {
        sound: true,
        activeBucketId: null,
        voiceURI: "",
        speechRate: 0.85,
      },
      buckets: [],
      weeks: {},
      progress: {},
      missions: {},
      football: F.fresh(),
      attempts: [],
      session: null,
    }
  }
  function normalizeProgress(p) {
    if (!object(p)) throw Error("Invalid word progress.")
    const out = freshProgress()
    for (const k of ["seen", "correct", "mistakes", "streak"])
      if (p[k] !== undefined) {
        if (!count(p[k])) throw Error("Invalid progress count.")
        out[k] = p[k]
      }
    if (
      p.status !== undefined &&
      !["New", "Learning", "Difficult", "Mastered"].includes(p.status)
    )
      throw Error("Invalid progress status.")
    out.status = p.status || "New"
    out.successDays = strings(p.successDays, "review days").filter(validDate)
    out.due = validDate(p.due) ? p.due : today()
    if (validDate(p.lastSeen)) out.lastSeen = p.lastSeen
    return out
  }
  function normalizeWord(w) {
    if (!object(w)) throw Error("Invalid word.")
    const out = {
      id: text(w.id, "word ID", 200),
      word: text(w.word, "word", 100),
      definition: text(w.definition, "definition", 1000),
      aliases: strings(w.aliases, "aliases"),
      choices: strings(w.choices, "choices"),
    }
    if (w.assetId) out.assetId = text(w.assetId, "picture ID", 200)
    if (w.scene && typeof w.scene === "string")
      out.scene = w.scene.slice(0, 100)
    if (w.sources !== undefined) {
      if (!object(w.sources)) throw Error("Invalid screenshot references.")
      out.sources = {}
      for (const k of ["description", "word", "layout"])
        if (w.sources[k])
          out.sources[k] = text(w.sources[k], "screenshot reference", 200)
    }
    if (w.crop !== undefined) {
      if (!object(w.crop)) throw Error("Invalid picture crop.")
      const { x, y, w: width, h } = w.crop
      if (
        ![x, y, width, h].every(Number.isFinite) ||
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        h <= 0 ||
        x + width > 1.001 ||
        y + h > 1.001
      )
        throw Error("Invalid picture crop.")
      out.crop = { x, y, w: width, h }
      if (w.crop.sourceId)
        out.crop.sourceId = text(w.crop.sourceId, "crop source", 200)
    }
    return out
  }
  function normalizeBuckets(buckets) {
    if (!Array.isArray(buckets) || !buckets.length || buckets.length > 500)
      throw Error("A backup needs at least one word collection.")
    const ids = new Set()
    return buckets.map((b) => {
      if (!object(b) || !Array.isArray(b.words) || b.words.length > 10000)
        throw Error("Invalid collection.")
      const id = safeKey(text(b.id, "collection ID", 200))
      if (ids.has(id)) throw Error("Duplicate collection ID.")
      ids.add(id)
      const words = b.words.map(normalizeWord),
        wids = new Set()
      for (const w of words) {
        if (wids.has(w.id)) throw Error("Duplicate word ID in " + b.name + ".")
        wids.add(w.id)
      }
      return { id, name: text(b.name, "collection name", 150), words }
    })
  }
  function snapshot(w) {
    const {
      id,
      word,
      definition,
      aliases = [],
      choices = [],
      assetId,
      scene,
    } = w
    return {
      id,
      word,
      definition,
      aliases: [...aliases],
      choices: [...choices],
      ...(assetId ? { assetId } : {}),
      ...(scene ? { scene } : {}),
    }
  }
  function normalizeResponse(r) {
    if (
      !object(r) ||
      typeof r.correct !== "boolean" ||
      typeof r.answer !== "string"
    )
      throw Error("Invalid saved answer.")
    return {
      word: normalizeWord(r.word),
      answer: r.answer.slice(0, 1000),
      correct: r.skipped ? false : r.correct,
      skipped: !!r.skipped,
      hint: !!r.hint,
      kind: typeof r.kind === "string" ? r.kind.slice(0, 40) : "write",
      retry: !!r.retry,
      firstTryCorrect:
        typeof r.firstTryCorrect === "boolean" ? r.firstTryCorrect : r.correct,
      ...(typeof r.firstAnswer === "string"
        ? { firstAnswer: r.firstAnswer.slice(0, 1000) }
        : {}),
    }
  }
  function normalizeAttempt(a) {
    if (
      !object(a) ||
      !Array.isArray(a.responses) ||
      a.responses.length > 10000 ||
      !count(a.score) ||
      typeof a.date !== "string" ||
      !Number.isFinite(Date.parse(a.date))
    )
      throw Error("Invalid test history.")
    const responses = a.responses.map(normalizeResponse)
    if (a.score > responses.length) throw Error("Invalid test score.")
    return {
      id: text(a.id, "attempt ID", 200),
      bucketId: text(a.bucketId, "attempt collection", 200),
      bucketName: text(a.bucketName, "attempt collection name", 150),
      type: [
        "test",
        "definition",
        "weekly",
        "test-listen",
        "test-builder",
        "test-find",
      ].includes(a.type)
        ? a.type
        : a.weekly
          ? "weekly"
          : "test",
      date: a.date,
      score: responses.filter((r) => r.correct).length,
      responses,
    }
  }
  function normalizeSession(s) {
    if (s == null) return null
    if (
      !object(s) ||
      ![
        "mission",
        "review",
        "cards",
        "learn",
        "builder",
        "definition",
        "test",
        "weekly",
        "test-listen",
        "test-builder",
        "test-find",
      ].includes(s.mode) ||
      !Array.isArray(s.tasks) ||
      s.tasks.length > 30000 ||
      !count(s.index) ||
      s.index > s.tasks.length
    )
      throw Error("Invalid saved practice.")
    const tasks = s.tasks.map((t) => {
      if (
        !object(t) ||
        ![
          "picture",
          "listen",
          "builder",
          "definition",
          "write",
          "card",
          "listen-write",
        ].includes(t.kind)
      )
        throw Error("Invalid saved task.")
      return {
        kind: t.kind,
        word: normalizeWord(t.word),
        retry: !!t.retry,
        exposed: !!t.exposed,
        attempts: t.attempts === 1 ? 1 : 0,
        ...(t.firstWrong !== undefined
          ? { firstWrong: String(t.firstWrong).slice(0, 1000) }
          : {}),
      }
    })
    if (!Array.isArray(s.records) || s.records.length > s.tasks.length)
      throw Error("Invalid practice answers.")
    const records = s.records.map(normalizeResponse)
    if (records.length !== s.index) throw Error("Saved practice is incomplete.")
    return {
      id: text(s.id, "session ID", 200),
      bucketId: text(s.bucketId, "session collection", 200),
      bucketName: text(s.bucketName, "session collection name", 150),
      mode: s.mode,
      tasks,
      index: s.index,
      records,
      startedAt:
        typeof s.startedAt === "string"
          ? s.startedAt
          : new Date().toISOString(),
      missionDate: validDate(s.missionDate) ? s.missionDate : today(),
      finished: s.index === tasks.length,
    }
  }
  function normalizeState(raw) {
    if (!object(raw) || raw.version !== VERSION)
      throw Error("Unsupported WordBloom data version.")
    const state = newState()
    state.buckets = normalizeBuckets(raw.buckets)
    state.football = F.normalize(raw.football)
    state.settings.sound = raw.settings?.sound !== false
    state.settings.voiceURI =
      typeof raw.settings?.voiceURI === "string"
        ? raw.settings.voiceURI.slice(0, 500)
        : ""
    state.settings.speechRate = Number.isFinite(raw.settings?.speechRate)
      ? Math.max(0.65, Math.min(1.1, raw.settings.speechRate))
      : 0.85
    state.settings.activeBucketId = state.buckets.some(
      (b) => b.id === raw.settings?.activeBucketId
    )
      ? raw.settings.activeBucketId
      : state.buckets.find((b) => b.words.length)?.id || state.buckets[0].id
    for (const domain of ["weeks", "progress", "missions"])
      if (raw[domain] !== undefined && !object(raw[domain]))
        throw Error("Invalid " + domain + ".")
    for (const b of state.buckets) {
      const cfg = own(raw.weeks || {}, b.id) ? raw.weeks[b.id] : null
      if (cfg) {
        if (
          !object(cfg) ||
          !validDate(cfg.startDate) ||
          !validDate(cfg.testDate) ||
          cfg.testDate < cfg.startDate ||
          !Array.isArray(cfg.learningDays) ||
          !cfg.learningDays.length ||
          cfg.learningDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
        )
          throw Error("Invalid weekly schedule.")
        state.weeks[b.id] = {
          startDate: cfg.startDate,
          testDate: cfg.testDate,
          learningDays: [...new Set(cfg.learningDays)],
        }
      }
    }
    for (const [k, p] of Object.entries(raw.progress || {}))
      state.progress[safeKey(k)] = normalizeProgress(p)
    for (const [k, m] of Object.entries(raw.missions || {})) {
      if (
        !object(m) ||
        !validDate(m.date) ||
        typeof m.completedAt !== "string" ||
        !Number.isFinite(Date.parse(m.completedAt))
      )
        throw Error("Invalid mission history.")
      state.missions[safeKey(k)] = { date: m.date, completedAt: m.completedAt }
    }
    if (!Array.isArray(raw.attempts)) throw Error("Invalid test history.")
    state.attempts = raw.attempts.map(normalizeAttempt)
    if (new Set(state.attempts.map((a) => a.id)).size !== state.attempts.length)
      throw Error("Duplicate test history ID.")
    state.session = normalizeSession(raw.session)
    if (
      state.session &&
      !state.buckets.some((b) => b.id === state.session.bucketId)
    )
      state.session = null
    return state
  }
  function assetId(data) {
    let a = 2166136261,
      b = 5381
    for (let i = 0; i < data.length; i++) {
      a = Math.imul(a ^ data.charCodeAt(i), 16777619)
      b = Math.imul(b, 33) ^ data.charCodeAt(i)
    }
    return (
      "img-" +
      (a >>> 0).toString(16) +
      "-" +
      (b >>> 0).toString(16) +
      "-" +
      data.length
    )
  }
  function validImage(data) {
    return (
      typeof data === "string" &&
      (/^(https?:\/\/)[^\s]+$/i.test(data) ||
        /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(data))
    )
  }
  function normalizeAssets(input) {
    if (!Array.isArray(input) || input.length > 30000)
      throw Error("Invalid picture library.")
    const ids = new Set()
    return input.map((a) => {
      if (!object(a) || !validImage(a.data) || a.data.length > 24 * 1024 * 1024)
        throw Error("Invalid or oversized picture.")
      const id = text(a.id, "picture ID", 200)
      if (ids.has(id)) throw Error("Duplicate picture ID.")
      ids.add(id)
      return {
        id,
        data: a.data,
        name: typeof a.name === "string" ? a.name.slice(0, 200) : "Picture",
      }
    })
  }
  function checkReferences(state, assets) {
    const ids = new Set(assets.map((a) => a.id))
    const check = (w) => {
      if (w.assetId && !ids.has(w.assetId))
        throw Error("Backup is missing a picture for “" + w.word + "”.")
      for (const id of [w.sources?.description, w.sources?.word])
        if (id && !ids.has(id))
          throw Error(
            "Backup is missing an original screenshot for “" + w.word + "”."
          )
    }
    state.buckets.forEach((b) => b.words.forEach(check))
    state.attempts.forEach((a) => a.responses.forEach((r) => check(r.word)))
    state.session?.tasks.forEach((t) => check(t.word))
  }
  function decodeBackup(value, extraSources = {}) {
    if (!object(value) && !Array.isArray(value))
      throw Error("Choose a WordBloom or Word Garden JSON backup.")
    if (value.format === "wordbloom-v3") {
      const state = normalizeState(value.state),
        assets = normalizeAssets(value.assets)
      checkReferences(state, assets)
      return { state, assets, legacy: false }
    }
    const input = Array.isArray(value) ? value : value.buckets
    if (!Array.isArray(input)) throw Error("Unsupported backup format.")
    const assets = new Map(),
      warnings = []
    for (const a of Object.values({
      ...extraSources,
      ...(value.sources || {}),
    })) {
      const list = normalizeAssets([a])
      assets.set(list[0].id, list[0])
    }
    const convert = (w) => {
      if (!object(w)) throw Error("Invalid word.")
      const out = { ...w }
      if (out.image) {
        if (!validImage(out.image))
          throw Error("Invalid picture for " + out.word + ".")
        out.assetId = assetId(out.image)
        assets.set(out.assetId, {
          id: out.assetId,
          data: out.image,
          name: out.word,
        })
      }
      delete out.image
      if (out.sources) {
        out.sources = { ...out.sources }
        for (const k of ["description", "word"])
          if (out.sources[k] && !assets.has(out.sources[k])) {
            warnings.push(
              "Some original screenshots were not included; visible pictures were kept."
            )
            delete out.sources[k]
          }
      }
      return normalizeWord(out)
    }
    const state = newState()
    state.buckets = normalizeBuckets(
      input.map((b) => ({
        ...b,
        words: Array.isArray(b.words) ? b.words.map(convert) : b.words,
      }))
    )
    state.settings.activeBucketId =
      state.buckets.find((b) => b.words.length === 10)?.id ||
      state.buckets[0].id
    if (value.learning !== undefined) {
      const l = value.learning
      if (
        !object(l) ||
        !Array.isArray(l.attempts) ||
        !Array.isArray(l.events) ||
        !object(l.weeks) ||
        !object(l.progress) ||
        !object(l.missions)
      )
        throw Error(
          "The learning history is incomplete. Nothing has been imported."
        )
      if (state.buckets.some((b) => b.id === l.activeBucketId))
        state.settings.activeBucketId = l.activeBucketId
      for (const b of state.buckets) {
        if (l.weeks[b.id]) state.weeks[b.id] = clone(l.weeks[b.id])
        for (const w of b.words) {
          const p = l.progress[b.id + ":" + w.id]
          if (p) state.progress[key(b.id, w.id)] = normalizeProgress(p)
        }
      }
      for (const [oldKey, m] of Object.entries(l.missions)) {
        const b = state.buckets.find((b) => oldKey.startsWith(b.id + ":"))
        state.missions[b ? key(b.id, m.date) : oldKey] = clone(m)
      }
      state.attempts = l.attempts.map((a) =>
        normalizeAttempt({
          ...a,
          type:
            a.type === "definition"
              ? "definition"
              : a.weekly
                ? "weekly"
                : "test",
          responses: a.responses?.map((r) => ({ ...r, word: convert(r.word) })),
        })
      )
    }
    const cleaned = normalizeState(state)
    return {
      state: cleaned,
      assets: [...assets.values()],
      legacy: true,
      warnings: [...new Set(warnings)],
    }
  }
  function mergeData(current, incoming, existingAssets = []) {
    const state = clone(current),
      assets = new Map(existingAssets.map((a) => [a.id, a])),
      remap = new Map()
    for (const a of incoming.assets) {
      const existing = assets.get(a.id)
      if (existing && existing.data !== a.data) {
        const id = assetId(a.data)
        if (assets.has(id) && assets.get(id).data !== a.data)
          throw Error("Picture ID conflict; use a full restore instead.")
        remap.set(a.id, id)
        assets.set(id, { ...a, id })
      } else assets.set(a.id, a)
    }
    const other = clone(incoming.state)
    const rewrite = (w) => {
      if (remap.has(w.assetId)) w.assetId = remap.get(w.assetId)
      for (const k of ["description", "word"])
        if (remap.has(w.sources?.[k])) w.sources[k] = remap.get(w.sources[k])
      if (remap.has(w.crop?.sourceId))
        w.crop.sourceId = remap.get(w.crop.sourceId)
    }
    other.buckets.forEach((b) => b.words.forEach(rewrite))
    other.attempts.forEach((a) => a.responses.forEach((r) => rewrite(r.word)))
    for (const b of other.buckets) {
      const match = state.buckets.find((x) => x.id === b.id)
      if (!match) state.buckets.push(b)
      else
        for (const w of b.words)
          if (!match.words.some((x) => x.id === w.id)) match.words.push(w)
    }
    for (const a of other.attempts)
      if (!state.attempts.some((x) => x.id === a.id)) state.attempts.push(a)
    for (const domain of ["weeks", "progress", "missions"])
      for (const [k, v] of Object.entries(other[domain]))
        if (!own(state[domain], k)) state[domain][k] = v
    state.football = F.merge(state.football, other.football)
    return { state: normalizeState(state), assets: [...assets.values()] }
  }
  function reviewWords(state, b) {
    return [...b.words].sort((a, c) => {
      const weight = (w) => {
        const p = progress(state, b.id, w.id)
        return (
          (p.status === "Difficult" ? 100 : 0) +
          (p.due <= today() ? 35 : 0) +
          (p.status === "New" ? 25 : 0) +
          p.mistakes * 3 -
          p.seen * 0.2
        )
      }
      return weight(c) - weight(a)
    })
  }
  function choices(w, b, rng = Math.random) {
    const used = new Set([norm(w.word), ...(w.aliases || []).map(norm)]),
      wrong = []
    for (const item of [
      ...(w.choices || []),
      ...shuffle(b.words, rng).map((x) => x.word),
      "outside",
      "around",
      "near",
      "inside",
      "before",
    ]) {
      if (
        !norm(item) ||
        used.has(norm(item)) ||
        b.words.some(
          (other) => norm(other.word) === norm(item) && correct(other, w.word)
        )
      )
        continue
      used.add(norm(item))
      wrong.push(item)
      if (wrong.length === 3) break
    }
    return shuffle([w.word, ...wrong], rng)
  }
  function pictureChoices(w, b, rng = Math.random) {
    const used = new Set(),
      items = []
    for (const item of [w, ...shuffle(b.words, rng)]) {
      if (item.id !== w.id && (correct(w, item.word) || correct(item, w.word)))
        continue
      const id =
        item.assetId ||
        (["next to", "beside"].includes(item.scene) ? "beside" : item.scene)
      if (!id || used.has(id)) continue
      used.add(id)
      items.push(snapshot(item))
      if (items.length === 4) break
    }
    return shuffle(items, rng)
  }
  function launch(state, mode, bid, { audio = true, date = today() } = {}) {
    const b = state.buckets.find((b) => b.id === bid)
    if (!b?.words.length) throw Error("Add a word before starting.")
    if (mode === "test-listen" && !audio)
      throw Error(
        "Audio is unavailable. Choose Look & Write, Build the Word or Read & Choose instead."
      )
    const words =
      mode === "mission"
        ? reviewWords(state, b).slice(0, 6)
        : mode === "review"
          ? reviewWords(state, b).slice(0, 6)
          : mode === "cards"
            ? b.words
            : shuffle(b.words)
    const task = (kind, w, retry = false) => ({
      kind,
      word: snapshot(w),
      retry,
    })
    let tasks
    if (mode === "mission")
      tasks = words.map((w, i) =>
        task(
          i % 3 === 0
            ? pictureChoices(w, b).length > 1
              ? "picture"
              : "definition"
            : i % 3 === 1
              ? audio
                ? "listen"
                : "definition"
              : "builder",
          w
        )
      )
    else
      tasks = words.map((w) =>
        task(
          mode === "cards"
            ? "card"
            : ["builder", "test-builder"].includes(mode)
              ? "builder"
              : mode === "test-listen"
                ? "listen-write"
                : ["definition", "learn", "test-find"].includes(mode)
                  ? "definition"
                  : "write",
          w
        )
      )
    state.session = {
      id: uid(),
      mode,
      bucketId: b.id,
      bucketName: b.name,
      tasks,
      index: 0,
      records: [],
      startedAt: new Date().toISOString(),
      missionDate: validDate(date) ? date : today(),
      finished: false,
    }
    return state.session
  }
  function record(state, bid, w, answer, hint, exposure = false) {
    const p = clone(progress(state, bid, w.id))
    p.seen++
    p.lastSeen = today()
    if (exposure) {
      if (p.status === "New") p.status = "Learning"
    } else if (correct(w, answer)) {
      p.correct++
      if (!hint && !p.successDays.includes(today())) {
        p.successDays.push(today())
        p.streak++
        p.due = addDays(today(), p.streak >= 3 ? 7 : p.streak >= 2 ? 3 : 1)
      }
      p.status = p.streak >= 3 ? "Mastered" : "Learning"
    } else {
      p.mistakes++
      p.streak = 0
      p.successDays = []
      p.due = today()
      p.status = p.mistakes >= 2 ? "Difficult" : "Learning"
    }
    state.progress[key(bid, w.id)] = p
  }
  function answer(state, value, hint = false, { skip = false } = {}) {
    const s = state.session
    if (!s || s.finished || s.index >= s.tasks.length)
      throw Error("No active question.")
    const task = s.tasks[s.index]
    const isTest = [
      "test",
      "weekly",
      "definition",
      "test-listen",
      "test-builder",
      "test-find",
    ].includes(s.mode)
    if (
      !skip &&
      !isTest &&
      task.kind !== "card" &&
      !correct(task.word, value) &&
      !task.attempts
    ) {
      record(state, s.bucketId, task.word, value, hint, false)
      task.attempts = 1
      task.firstWrong = String(value).slice(0, 1000)
      return {
        word: snapshot(task.word),
        answer: String(value),
        correct: false,
        hint: true,
        kind: task.kind,
        retry: task.retry,
        secondChance: true,
        firstTryCorrect: false,
      }
    }
    hint = hint || !!task.attempts
    const r = {
      word: snapshot(task.word),
      answer: String(value),
      correct: !skip && (task.kind === "card" || correct(task.word, value)),
      skipped: !!skip,
      hint: !!hint,
      kind: task.kind,
      retry: task.retry,
      firstTryCorrect:
        !skip &&
        !task.attempts &&
        (task.kind === "card" || correct(task.word, value)),
      ...(task.firstWrong !== undefined
        ? { firstAnswer: task.firstWrong }
        : {}),
    }
    s.records.push(r)
    if (skip) {
      const p = clone(progress(state, s.bucketId, task.word.id))
      p.due = today()
      state.progress[key(s.bucketId, task.word.id)] = p
    } else if (task.kind !== "card" || !task.exposed)
      record(state, s.bucketId, task.word, value, hint, task.kind === "card")
    if (
      !skip &&
      !r.correct &&
      ![
        "test",
        "weekly",
        "definition",
        "test-listen",
        "test-builder",
        "test-find",
      ].includes(
        s.mode
      ) &&
      !s.tasks.some((t) => t.retry && t.word.id === task.word.id)
    )
      s.tasks.push({
        ...clone(task),
        retry: true,
        attempts: 0,
        firstWrong: undefined,
      })
    s.index++
    if (s.index === s.tasks.length) {
      s.finished = true
      if (s.mode === "mission" && s.records.some((r) => !r.skipped)) {
        state.missions[key(s.bucketId, s.missionDate)] = {
          date: s.missionDate,
          completedAt: new Date().toISOString(),
        }
      }
      if (
        [
          "test",
          "weekly",
          "definition",
          "test-listen",
          "test-builder",
          "test-find",
        ].includes(s.mode)
      ) {
        if (!state.football) state.football = F.fresh()
        if (s.mode === "test") {
          F.addProgress(state.football, 60, today(), "test")
        } else if (s.mode === "test-listen") {
          F.addProgress(state.football, 30, today(), "test")
        } else if (s.mode === "test-builder") {
          F.addProgress(state.football, 30, today(), "test")
        } else {
          F.addProgress(state.football, 20, today(), "test")
        }
        const responses = s.records.filter((r) => !r.retry)
        state.attempts.push({
          id: s.id,
          bucketId: s.bucketId,
          bucketName: s.bucketName,
          type: s.mode,
          date: new Date().toISOString(),
          score: responses.filter((r) => r.correct).length,
          responses: clone(responses),
        })
      }
    }
    return r
  }
  return {
    VERSION,
    football: F,
    norm,
    clone,
    uid,
    today,
    validDate,
    addDays,
    key,
    correct,
    shuffle,
    newState,
    normalizeState,
    normalizeWord,
    normalizeAssets,
    decodeBackup,
    mergeData,
    assetId,
    validImage,
    checkReferences,
    progress,
    reviewWords,
    choices,
    pictureChoices,
    launch,
    answer,
    record,
    snapshot,
  }
})
