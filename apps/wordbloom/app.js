/* WordBloom: one learning engine, atomic persistence, English-only interface.
 * @spec L2-UI-75
 */
"use strict"
const C = window.WordBloom,
  Store = window.BloomStore
const $ = (id) => document.getElementById(id)
const assetUrl = (path) => (window.WORD_BLOOM_ASSET_BASE || "") + path
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]
  )
let state,
  assetMap = new Map(),
  busy = false,
  toastTimer,
  ocrWorker,
  ocrPromise
const ui = {
  view: "home",
  selected: null,
  feedback: null,
  taskKey: null,
  options: [],
  tiles: [],
  letters: [],
  hint: 0,
  flipped: false,
  edit: null,
  import: null,
  search: "",
  audioFallback: false,
  audioTaskKey: null,
  flipping: false,
}
const labels = {
  review: "Smart review",
  cards: "Flashcards",
  learn: "Choose the word",
  builder: "Word builder",
  definition: "Read & Choose",
  test: "Look & Write",
  "test-listen": "Listen & Write",
  "test-builder": "Build the Word",
  "test-find": "Find a Word",
  weekly: "Weekly test",
}
const active = () =>
  state.buckets.find((b) => b.id === state.settings.activeBucketId) ||
  state.buckets[0]
const chosen = () => state.buckets.find((b) => b.id === ui.selected) || active()
function toast(message) {
  clearTimeout(toastTimer)
  $("toast").textContent = message
  $("toast").hidden = false
  toastTimer = setTimeout(() => ($("toast").hidden = true), 6500)
}
function saveError(error) {
  $("saveError").textContent =
    (error?.name === "QuotaExceededError"
      ? "This device has run out of storage. Export a backup and free some space. "
      : error?.message || "Saving failed. ") +
    " Your last saved data has been kept. Retry before leaving this page."
  $("saveError").hidden = false
}
async function mutate(fn, pictures = [], replace = false) {
  const next = C.clone(state)
  await fn(next)
  await Store.commit(next, pictures, replace)
  state = next
  for (const picture of pictures) assetMap.set(picture.id, picture)
  $("saveError").hidden = true
  return next
}
async function commitImport(data) {
  await Store.commit(data.state, data.assets, true)
  state = data.state
  assetMap = new Map(data.assets.map((a) => [a.id, a]))
  ui.selected = active().id
  ui.feedback = null
  ui.view = "parent"
  ui.search = ""
  $("saveError").hidden = true
  closeModal()
  render()
  toast("Your data is saved. You’re ready to grow.")
}
function setView(view) {
  const leavingPractice = ui.view === "practice" && view !== "practice"
  stopAudio()
  ui.view = view
  ui.feedback = null
  render()
  const shell = document.querySelector(".wordbloomRoot")
  if (shell) shell.scrollTop = 0
  else window.scrollTo({ top: 0, behavior: "instant" })
  if (leavingPractice && history.state?.wordBloomPractice)
    history.back()
}
function stopAudio() {
  window.speechSynthesis?.cancel()
}
function nextTask() {
  if (ui.view !== "practice" || !ui.feedback) return
  ui.feedback = null
  ui.taskKey = null
  ui.audioFallback = false
  render()
}
function englishVoices() {
  return (window.speechSynthesis?.getVoices?.() || []).filter((v) =>
    /^en(?:-|_)/i.test(v.lang)
  )
}
function preferredVoice(voices = englishVoices()) {
  const saved = voices.find((v) => v.voiceURI === state.settings.voiceURI)
  if (saved) return saved
  // Names identify available natural/enhanced voices; this is a preference, not a quality guarantee.
  const score = (v) =>
    (/premium|enhanced|natural|neural/i.test(v.name) ? 200 : 0) +
    (/Daniel|Serena|Kate|Samantha/i.test(v.name) ? 30 : 0) +
    (/en[-_]GB/i.test(v.lang) ? 20 : 0) +
    (v.default ? 10 : 0) +
    (v.localService ? 5 : 0)
  return [...voices].sort((a, b) => score(b) - score(a))[0] || null
}
function hasAudio() {
  return !!(
    window.speechSynthesis &&
    window.SpeechSynthesisUtterance &&
    state.settings.sound
  )
}
function speak(text, preview = false) {
  if (!hasAudio()) return fallbackAudio()
  stopAudio()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice =
    preview && $("voiceSelect")
      ? englishVoices().find((v) => v.voiceURI === $("voiceSelect").value) ||
        preferredVoice()
      : preferredVoice()
  utterance.lang = utterance.voice?.lang || "en-GB"
  utterance.rate =
    preview && $("speechRate")
      ? Number($("speechRate").value)
      : state.settings.speechRate
  utterance.onstart = () => {
    if (ui.audioFallback && ui.view === "practice" && !ui.feedback) {
      ui.audioFallback = false
      render()
    }
  }
  utterance.pitch = 1
  utterance.volume = 1
  utterance.onerror = (e) => {
    if (!["canceled", "interrupted"].includes(e.error)) fallbackAudio()
  }
  speechSynthesis.speak(utterance)
}
function voiceOptions(selected = state.settings.voiceURI) {
  return (
    '<option value="">Automatic · clearest English voice</option>' +
    englishVoices()
      .map(
        (v) =>
          `<option value="${esc(v.voiceURI)}" ${v.voiceURI === selected ? "selected" : ""}>${esc(v.name)} · ${esc(v.lang)}${v.localService ? " · on-device" : " · online"}</option>`
      )
      .join("")
  )
}
function voiceSettings() {
  modal(
    "A clearer little voice.",
    `<form id="voiceForm"><label for="voiceSelect">English voice</label><select id="voiceSelect">${voiceOptions()}</select><p class="notice">Try the voices on this device. Automatic prefers natural or enhanced English voices when available. Some online voices need internet.</p><label for="speechRate">Speaking speed</label><select id="speechRate">${[
      [0.7, "Slow"],
      [0.85, "Clear & steady"],
      [1, "Normal"],
    ]
      .map(
        ([rate, label]) =>
          `<option value="${rate}" ${Math.abs(state.settings.speechRate - rate) < 0.02 ? "selected" : ""}>${label}</option>`
      )
      .join(
        ""
      )}</select><div class="toolbar" style="margin-top:18px">${button("preview-voice", "◖)) Hear a sample", "secondary", hasAudio() ? "" : "disabled")}</div><p id="voiceStatus" class="notice" role="status">${englishVoices().length ? "Choose a voice, then hear how it sounds." : "Waiting for this browser’s English voices. If none appear, check the device’s speech settings."}</p><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}<button type="submit" class="primary">Save voice settings</button></div></form>`
  )
}
window.speechSynthesis?.addEventListener?.("voiceschanged", () => {
  if ($("voiceSelect")) {
    const selected = $("voiceSelect").value
    $("voiceSelect").innerHTML = voiceOptions(selected)
    $("voiceStatus").textContent = englishVoices().length
      ? "Choose a voice, then hear how it sounds."
      : "No English voice is available on this device."
  }
})
function fallbackAudio() {
  ui.audioFallback = true
  if (ui.view === "practice" && !ui.feedback) render()
  const task = state?.session?.tasks[state.session.index]
  toast(
    task?.kind === "listen-write"
      ? "Audio is unavailable. Try another voice or another test."
      : "Audio is unavailable. Use the written clue instead."
  )
}
function button(action, label, style = "primary", extra = "") {
  return `<button type="button" class="${style}" data-action="${action}" ${extra}>${label}</button>`
}
function heading(eyebrow, title, body = "", actions = "") {
  return `<div class="intro"><div><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${title}</h1>${body ? `<p>${body}</p>` : ""}</div>${actions}</div>`
}
function modal(title, body) {
  $("modalContent").innerHTML =
    `<div class="dialog-title"><h2 id="modalTitle">${title}</h2><button class="close-button" data-action="close-modal" aria-label="Close dialog">×</button></div>${body}`
  if (!$("modal").open) $("modal").showModal()
}
function closeModal() {
  ocrWorker?.terminate().catch(() => {})
  ocrWorker = null
  $("modal").close()
  ui.edit = null
  ui.import = null
  $("modalContent").innerHTML = ""
}
function collectionSelect(id, bid = active().id, label = "Word collection") {
  return `<label for="${id}">${label}</label><select id="${id}">${state.buckets
    .filter((b) => b.words.length)
    .map(
      (b) =>
        `<option value="${esc(b.id)}" ${b.id === bid ? "selected" : ""}>${esc(b.name)} · ${b.words.length} words</option>`
    )
    .join("")}</select>`
}
function stats(b) {
  const counts = { New: 0, Learning: 0, Difficult: 0, Mastered: 0 }
  b.words.forEach((w) => counts[C.progress(state, b.id, w.id).status]++)
  return counts
}
function statusPills(b) {
  return `<div class="status-row">${Object.entries(stats(b))
    .map(
      ([name, n]) =>
        `<span class="pill ${name === "Mastered" ? "good" : ""}">${name} · ${n}</span>`
    )
    .join("")}</div>`
}
function picture(w) {
  const asset = assetMap.get(w.assetId)
  if (asset)
    return `<img src="${esc(asset.data)}" alt="Picture clue" loading="lazy" referrerpolicy="no-referrer">`
  if (!w.scene) return '<span class="tile-symbol" aria-hidden="true">✳</span>'
  const box = (x, y) =>
    `<rect x="${x}" y="${y}" width="100" height="70" rx="8" fill="#d4b784"/><path d="M${x + 50} ${y}v70" stroke="#b79663" stroke-width="3"/>`
  const fox = (x, y) =>
    `<g transform="translate(${x} ${y})"><path d="M-24 20Q-60 12-46-18L-23 2" fill="#d9935a"/><ellipse cy="13" rx="23" ry="23" fill="#dd995e"/><path d="M-27-12l-2-32 22 16Q0-31 8-28l22-17-3 34Q20 18 0 16Q-24 13-27-12" fill="#e7a06a"/><path d="M-24-7Q-13-12 0 8Q13-12 24-7Q16 19 0 16Q-17 18-24-7" fill="#fff5de"/><circle cx="-9" cy="-12" r="2.7" fill="#34463a"/><circle cx="9" cy="-12" r="2.7" fill="#34463a"/><path d="M-4 4h8l-4 5z" fill="#34463a"/></g>`
  let scene
  switch (w.scene) {
    case "in":
      scene =
        box(150, 110) +
        fox(200, 103) +
        `<rect x="150" y="137" width="100" height="43" rx="5" fill="#d4b784"/>`
      break
    case "on":
      scene = box(150, 130) + fox(200, 91)
      break
    case "under":
      scene =
        '<path d="M110 105h180M125 105v90M275 105v90" stroke="#b99b6a" stroke-width="10" stroke-linecap="round"/>' +
        fox(200, 150)
      break
    case "above":
      scene = fox(200, 53) + box(150, 135)
      break
    case "behind":
      scene = fox(225, 105) + box(150, 125)
      break
    case "in front of":
      scene = box(150, 92) + fox(200, 164)
      break
    case "between":
      scene = box(58, 120) + box(258, 120) + fox(208, 150)
      break
    default:
      scene = box(100, 120) + fox(285, 155)
  }
  return `<svg viewBox="0 0 400 230" role="img" aria-label="A fox showing a position"><ellipse cx="200" cy="208" rx="160" ry="9" fill="#e0e7d8"/>${scene}</svg>`
}
function audioButton(action = "hear-clue", label = "Hear the clue") {
  return hasAudio()
    ? button(
        action,
        '<span aria-hidden="true">◖))</span> ' + label,
        "sound-button"
      )
    : ""
}
function render() {
  if (!state) return
  const nav =
    ui.view === "team"
      ? "team"
      : ui.view === "parent"
        ? "parent"
        : ui.view === "review-home"
          ? "review"
          : ui.view === "test-home"
            ? "test"
            : ui.view === "practice"
              ? state.session?.mode === "review"
                ? "review"
                : [
                      "test",
                      "weekly",
                      "definition",
                      "test-listen",
                      "test-builder",
                      "test-find",
                    ].includes(state.session?.mode)
                  ? "test"
                  : "test"
              : "test"
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === nav)
    if (b.dataset.nav === nav) b.setAttribute("aria-current", "page")
    else b.removeAttribute("aria-current")
  })
  if (ui.view === "practice") renderPractice()
  else if (ui.view === "team") renderTeam()
  else if (ui.view === "parent") renderParent()
  else if (ui.view === "review-home" || ui.view === "test-home" || ui.view === "extra")
    renderStart()
  else renderHome()
  updatePracticeViewport()
  $("app").setAttribute("aria-busy", "false")
  $("storageLabel").textContent = "Saved on this browser."
}
function coach(pose = "neutral", extra = "") {
  return `<span class="coach coach-${pose} ${extra}" role="img" aria-label="Fox football coach"></span>`
}
function portrait(p) {
  const photo = window.BloomPortraits?.[p.id]
  if (photo)
    return `<span class="player-portrait player-photo"><img src="${esc(assetUrl(photo.src))}" alt="${esc(p.name)}" loading="lazy"></span>`
  if (p.atlas <= 2)
    return `<span class="player-portrait" role="img" aria-label="Illustration of ${esc(p.name)}" style="background-image:url('${assetUrl(`assets/football/players-${p.atlas}.png`)}');background-position:${((p.tile % 4) * 100) / 3}% ${(Math.floor(p.tile / 4) * 100) / 3}%"></span>`
  return `<span class="player-monogram" aria-label="${esc(p.name)} player card"><span class="kit-shape">${esc(
    p.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
  )}</span><small>${esc(p.country)}</small></span>`
}
function footballCard(
  p,
  { action = "player-detail", reward = null, locked = false, slot = null } = {}
) {
  const collected = C.football.ownedIds(state.football).includes(p.id)
  return `<button type="button" class="player-card ${locked ? "is-locked" : ""} ${collected ? "is-collected" : ""}" data-action="${action}" data-id="${p.id}" ${reward ? `data-reward="${reward.id}"` : ""} ${slot ? `data-slot="${slot}"` : ""}><span class="player-card-top"><span class="position-badge">${p.role}</span><span>${state.football.captain === p.id ? "★ Captain" : collected ? "✓ In your club" : locked ? "To collect" : "2026"}</span></span>${portrait(p)}<strong>${esc(p.name)}</strong><small>${esc(p.country)} · ${C.football.roles[p.role]}</small>${reward ? '<span class="pick-player-label">Choose player →</span>' : ""}</button>`
}
function rewardPanel() {
  const F = C.football,
    reward = F.pending(state.football)
  if (!reward) {
    const todays = state.football.rewards.find(
      (r) => r.earnedOn === C.today() && r.playerId
    )
    return todays
      ? `<section class="club-success"><span>⚽</span><div><strong>${esc(F.byId[todays.playerId].name)} is in your club!</strong><p>Every test counts toward your next player.</p></div>${button("team", "My Team →", "secondary")}</section>`
      : ""
  }
  const source =
    {
      "writing-test": "Writing test reward",
      test: "Test progress reward",
    }[reward.reason] || "Football club reward"
  return `<section class="reward-panel" aria-labelledby="rewardTitle"><div class="reward-heading">${coach("celebrate")}<div><div class="eyebrow">${source} · ${reward.earnedOn}</div><h2 id="rewardTitle">Choose your player!</h2><p>Your player card is ready. Choose one star for your club.</p></div></div><div class="reward-options">${reward.options.map((id) => footballCard(F.byId[id], { action: "claim-player", reward })).join("")}</div><p class="notice">Choose one player for your footballer collection. Mistakes never take a reward away.</p></section>`
}
function renderTeam() {
  const F = C.football,
    data = state.football,
    owned = new Set(F.ownedIds(data)),
    role = ui.teamRole || "ALL",
    filled = Object.keys(data.lineup).length
  const line = (role) =>
    `<div class="pitch-row pitch-${role.toLowerCase()}">${F.slots
      .filter((s) => s.role === role)
      .map((slot) => {
        const p = F.byId[data.lineup[slot.id]]
        return `<button class="pitch-slot ${p ? "is-filled" : ""}" data-action="pitch-slot" data-slot="${slot.id}" aria-label="${p ? esc(p.name) : "Choose a " + F.roles[slot.role]} for ${slot.id.toUpperCase()}">${p ? `<span class="pitch-player">${portrait(p)}${data.captain === p.id ? '<span class="captain-badge">C</span>' : ""}</span><strong>${esc(p.name)}</strong>` : `<span class="empty-shirt">＋</span><strong>${F.roles[slot.role]}</strong>`}<small>${slot.role}</small></button>`
      })
      .join("")}</div>`
  const pending = F.pending(data)
  $("app").innerHTML =
    heading(
      "YOUR FOOTBALL CLUB",
      esc(data.teamName),
      "Collect your stars. Pick your starting eleven.",
      `<div class="toolbar">${button("rename-team", "Name your team", "secondary")}${button("reset-football", "Reset collection", "text-button delete-link")}</div>`
    ) +
    (pending ? rewardPanel() : "") +
    `<div class="team-overview"><section class="pitch-wrap"><div class="pitch-caption"><span>STARTING XI · 4–3–3</span><strong>${filled}/11 positions filled</strong></div><div class="football-pitch"><span class="pitch-centre" aria-hidden="true"></span><span class="penalty-box box-top" aria-hidden="true"></span><span class="penalty-box box-bottom" aria-hidden="true"></span>${line("FW")}${line("MF")}${line("DF")}${line("GK")}</div><p class="notice">Tap a position to choose a collected player. Everyone else stays safely on your bench.</p></section><aside class="club-sidebar card">${coach(owned.size ? "happy" : "neutral")}<div class="eyebrow">YOUR COLLECTION</div><h2>${owned.size}<span> / ${F.players.length}</span></h2><p>${owned.size ? "A growing team." : "Your first football star is one test away."}</p><div class="collection-progress"><span style="width:${(owned.size / F.players.length) * 100}%"></span></div>${button(pending ? "show-reward" : "test-home", pending ? "Choose your earned player →" : "Choose a test →")}<p class="notice">Writing tests award a player. Other tests build your card progress.</p></aside></div>` +
    `<div class="section-heading"><h2>Your player collection</h2><small>${owned.size} collected · ${F.players.length - owned.size} still to meet</small></div><div class="team-filters" role="group" aria-label="Filter players by position">${[
      ["ALL", "All players"],
      ["GK", "Goalkeepers"],
      ["DF", "Defenders"],
      ["MF", "Midfielders"],
      ["FW", "Forwards"],
    ]
      .map(([key, name]) =>
        button(
          "team-filter",
          name,
          role === key ? "primary" : "secondary",
          `data-role="${key}" aria-pressed="${role === key}"`
        )
      )
      .join("")}</div><div class="player-collection">${F.players
      .filter((p) => role === "ALL" || p.role === role)
      .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)))
      .map((p) => footballCard(p, { locked: !owned.has(p.id) }))
      .join(
        ""
      )}</div><p class="notice collection-note">2026 illustrated fan collection. Names and simple squad roles, not official rankings. 32 illustrated portraits and 16 player photos. <a href="${assetUrl("photo-credits.html")}" target="_blank" rel="noopener noreferrer">Photo credits</a>.</p>`
}
function playerDetail(id) {
  const F = C.football,
    p = F.byId[id]
  if (!p) return
  const owned = F.ownedIds(state.football).includes(id),
    possibleSlots = F.slots.filter((s) =>
      p.role === "GK" ? s.role === "GK" : s.role !== "GK"
    ),
    slot =
      possibleSlots.find((s) => !state.football.lineup[s.id]) ||
      possibleSlots[0]
  modal(
    esc(p.name),
    `<div class="player-detail">${portrait(p)}<span class="pill">${esc(p.country)} · ${F.roles[p.role]}</span><p>${owned ? "Your player is safe in your collection. Pick a position to add them to your starting eleven." : "Complete a test to build your footballer collection."}</p></div><div class="dialog-actions">${owned ? button("assign-player", "Add to starting XI", "primary", `data-id="${id}" data-slot="${slot.id}"`) : button("test-home", "Choose a test", "secondary")}${owned ? button("captain", "Make captain", "secondary", `data-id="${id}"`) : ""}${button("close-modal", "Close", "secondary")}</div>`
  )
}
function pickPosition(slotId) {
  const F = C.football,
    slot = F.slots.find((s) => s.id === slotId)
  if (!slot) return
  const players = F.ownedIds(state.football)
    .map((id) => F.byId[id])
    .filter((p) =>
      slot.role === "GK" ? p.role === "GK" : p.role !== "GK"
    )
  modal(
    slot.role === "GK" ? "Choose your goalkeeper" : "Choose a player",
    players.length
      ? `<div class="position-options">${players.map((p) => footballCard(p, { action: "assign-player", slot: slot.id })).join("")}</div><div class="dialog-actions">${state.football.lineup[slot.id] ? button("clear-position", "Leave this position empty", "text-button", `data-slot="${slot.id}"`) : ""}${button("close-modal", "Close", "secondary")}</div>`
      : `<p>${slot.role === "GK" ? "No goalkeeper" : "No outfield players"} collected yet. Your next player choices can help fill this position.</p><div class="dialog-actions">${button("close-modal", "Got it")}</div>`
  )
}

function rewardProgressPanel() {
  const percent = state.football.rewardPercent || 0
  if (C.football.pending(state.football)) return ""
  return `<div class="reward-progress-card" aria-label="Football card progress"><div class="reward-progress-heading"><strong>Next football card&nbsp;</strong><span>${percent}%</span></div><div class="progress-track" role="progressbar" aria-label="Progress to next football card" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><p class="mini">Choose a test below to earn your next card.</p></div>`
}
function renderHome() {
  renderTestStart()
}
function testTile(mode, symbol, title, description, example, reward, disabled = false) {
  const bucketId = ui.selected || active().id,
    lockRemaining = testLockRemaining(bucketId, mode),
    locked = lockRemaining > 0,
    available = state.buckets.some((b) => b.words.length) && !disabled && !locked
  if (locked) scheduleTestUnlock(bucketId, mode, lockRemaining)
  const attempts = state.attempts.filter(
      (attempt) =>
        attempt.bucketId === bucketId &&
        attempt.type === mode
    ),
    perfect = attempts.some(
      (attempt) => attempt.responses.length > 0 && attempt.score === attempt.responses.length
    )
  const progress = `<span class="test-tile-history" aria-label="${attempts.length} completed ${title} tests">${perfect ? '<span class="test-tile-perfect" aria-label="Perfect test completed">✓</span>' : ""}${attempts.length} ${attempts.length === 1 ? "test" : "tests"}</span>`
  return `<button type="button" class="card tile test-tile" data-action="start-selected" data-mode="${mode}" ${available ? "" : "disabled"}><span class="tile-symbol" aria-hidden="true">${symbol}</span><div class="test-tile-copy"><div class="test-tile-heading"><h3 title="${title}">${title}</h3><strong class="test-tile-reward">${reward}</strong></div><p>${description}</p><small>Example: ${example}</small><div class="test-tile-history-row">${progress}</div>${locked ? `<small class="test-tile-lock-note">Locked for ${Math.ceil(lockRemaining / 60000)} min</small>` : disabled ? '<small class="test-tile-note">Audio is not available in this browser.</small>' : ""}</div><span class="arrow" aria-hidden="true">↗</span></button>`
}
const TEST_LOCK_MS = 15 * 60 * 1000
const testUnlockTimers = new Map()
function testLockKey(bucketId, mode) {
  return `wordbloom:test-lock:${bucketId}:${mode}`
}
function scheduleTestUnlock(bucketId, mode, remaining) {
  const key = testLockKey(bucketId, mode)
  if (remaining <= 0 || testUnlockTimers.has(key)) return
  const timer = window.setTimeout(() => {
    testUnlockTimers.delete(key)
    if (ui.view === "test-home") renderTestStart()
  }, remaining + 20)
  testUnlockTimers.set(key, timer)
}
function testLockRemaining(bucketId, mode) {
  try {
    const key = testLockKey(bucketId, mode),
      until = Number(localStorage.getItem(key)) || 0,
      remaining = until - Date.now()
    if (remaining <= 0 && until) localStorage.removeItem(key)
    return Math.max(0, remaining)
  } catch {
    return 0
  }
}
function renderTestStart() {
  const b = active(),
    collected = C.football.ownedIds(state.football).length
  $("app").innerHTML =
    (C.football.pending(state.football) ? rewardPanel() : "") +
    `<section class="card hero tests-hero"><div class="tests-hero-copy"><span class="hero-tag">⚽ FOOTBALLER CARD COLLECTION</span><h1>Let’s collect your team.</h1><p>Choose a test, grow your English and earn your next footballer card.</p><p class="mini">${collected} of 48 players collected · ${esc(b.name)}</p></div><div class="tests-hero-aside">${coach("neutral", "hero-coach")}${rewardProgressPanel()}</div></section><section class="test-launch"><div class="section-heading tests-heading"><div><h2>Choose a test</h2><small>Pick a challenge and get started.</small></div><div class="test-collection">${collectionSelect("startBucket", ui.selected || active().id, "Word Collection")}</div></div><div class="tiles test-tiles">${testTile("test-listen", "♪", "Listen & Write", "Listen, then type the word you hear.", "hear ‘apple’ → type apple", "Earn 30%", !hasAudio())}${testTile("test", "✎", "Look & Write", "Study the picture and write the word.", "see an apple → write apple", "Earn 60%")}${testTile("test-builder", "Aa", "Build the Word", "Put every letter in the right order.", "A · P · P · L · E → APPLE", "Earn 30%")}${testTile("test-find", "⌕", "Find a Word", "Choose the word that matches the clue.", "red fruit → apple", "Earn 20%")}${testTile("definition", "☷", "Read & Choose", "Read a definition and pick its word.", "a place to watch football → stadium", "Earn 20%")}</div></section><section class="club-home card"><div><div class="eyebrow">FOOTBALLER CARD COLLECTION</div><h2>${collected} of 48 players collected</h2><p>Every test adds progress toward your next card.</p></div>${button("team", "View your collection →", "secondary")}</section>`
}
function renderStart() {
  if (ui.view === "test-home") {
    renderTestStart()
    return
  }

  const isReview = ui.view === "review-home",
    extra = ui.view === "extra",
    mode = extra ? ui.extraMode : "review"
  $("app").innerHTML =
    heading(
      isReview ? "A little extra care" : "Practise your way",
      isReview ? "Let’s revisit a few words." : labels[mode],
      isReview
        ? "We’ll choose up to six words that need a little practice."
        : "No rush. Every small step helps."
    ) +
    `<section class="card practice-shell">${isReview ? collectionSelect("startBucket", ui.selected || active().id) : ""}<div class="toolbar" style="margin-top:23px">${button("start-selected", "Let’s begin →", "primary", `data-mode="${mode}" ${state.buckets.some((b) => b.words.length) ? "" : "disabled"}`)}</div><p class="notice" style="margin-top:18px">${isReview ? "Tricky and due words come first. A correct answer on three different days builds mastery." : "You can pause any time. Every submitted answer is saved before you move on."}</p></section>`
}
async function begin(mode, bid = active().id, date = C.today()) {
  await launch(mode, bid, date)
}
async function launch(mode, bid, date) {
  if (!history.state?.wordBloomPractice)
    history.pushState(
      { ...(history.state || {}), wordBloomPractice: true },
      "",
      location.href
    )
  await mutate((next) => C.launch(next, mode, bid, { audio: hasAudio(), date }))
  if ($("modal").open) closeModal()
  ui.taskKey = null
  ui.feedback = null
  ui.audioFallback = false
  setView("practice")
}
function taskState() {
  const s = state.session
  if (!s || s.finished) return null
  const key = s.id + ":" + s.index
  if (ui.taskKey !== key) {
    ui.taskKey = key
    ui.tiles = []
    ui.hint = 0
    ui.answerDraft = ""
    ui.flipped = false
    ui.flipping = false
    const t = s.tasks[s.index],
      b = state.buckets.find((b) => b.id === s.bucketId) || {
        words: s.tasks.map((t) => t.word),
      }
    ui.options =
      t.kind === "picture" ? C.pictureChoices(t.word, b) : C.choices(t.word, b)
    ui.letters = C.shuffle(
      [...t.word.word.toUpperCase()].map((letter, id) => ({ letter, id }))
    )
  }
  return s.tasks[s.index]
}
/** A native SVG animation: no extra image downloads, and no motion when reduced motion is requested. */
function shotScene(success = true) {
  return `<svg class="shot-scene ${success ? "is-goal" : "is-miss"}" viewBox="0 0 320 175" role="img" aria-label="${success ? "A little fox scores a goal" : "A little fox misses and gets ready to try again"}"><ellipse cx="164" cy="147" rx="144" ry="16" fill="#e1ecd5"/><g class="shot-goal"><path d="M230 136V53h72v83M230 53l-17 16v67h89" fill="#f8fcf3" stroke="#6d9a72" stroke-width="4" stroke-linejoin="round"/><path d="M242 55v79m13-79v79m13-79v79m13-79v79m13-79v79M231 70h69m-69 16h69m-69 16h69m-69 16h69" stroke="#b6cfb1" stroke-width="1.4"/></g><g class="fox-child"><path d="M40 110Q10 101 25 79L48 95" fill="#df8b4a"/><path d="M26 80l10 10-13 7" fill="#fff4d9"/><g class="shot-standing-leg"><path d="M53 111v23" stroke="#305d45" stroke-width="12" stroke-linecap="round"/><path d="M50 136h15" stroke="#263e34" stroke-width="8" stroke-linecap="round"/></g><g class="shot-kicking-leg"><path d="M70 109l14 21" stroke="#305d45" stroke-width="12" stroke-linecap="round"/><path d="M83 134h17" stroke="#263e34" stroke-width="8" stroke-linecap="round"/></g><path d="M43 78Q61 69 78 78l8 30H37z" fill="#326b4f"/><path d="M51 77l10 10 11-10M43 101h35" stroke="#fff2cd" stroke-width="4" fill="none"/><path d="M42 81l-14 13m50-13 13 11" stroke="#d88849" stroke-width="9" stroke-linecap="round"/><path d="M32 39l-2-28 24 16Q63 22 72 27l23-16-3 29Q88 75 62 77Q34 72 32 39" fill="#e6a064"/><path d="M36 38l-2-19 16 14m24 0 17-14-3 19" fill="#ba713e"/><path d="M34 49Q48 44 62 65Q76 44 91 49Q81 76 62 77Q43 75 34 49" fill="#fff3d8"/><circle cx="49" cy="45" r="3.3" fill="#294537"/><circle cx="76" cy="45" r="3.3" fill="#294537"/><path d="M57 62h10l-5 6z" fill="#294537"/><path d="M57 70q5 5 10 0" fill="none" stroke="#294537" stroke-width="1.8" stroke-linecap="round"/></g><g transform="translate(105 129)"><g class="shot-ball"><circle r="10" fill="#fffdf0" stroke="#294d39" stroke-width="1.5"/><path d="m0-5 5 4-2 6h-6l-2-6zM0-5v-5m5 9 5-2M3 5l3 4m-9-4-3 4m1-10-5-2" stroke="#294d39" stroke-width="1.5" fill="#315c44"/></g></g><text class="shot-caption" x="169" y="28" text-anchor="middle" fill="#2e6346" font-size="17" font-family="system-ui,sans-serif" font-weight="700">${success ? "GOAL!" : "Another try!"}</text></svg>`
}
function builderWordMarkup(answered = false) {
  return ui.tiles
    .map(
      (id) =>
        `<button type="button" data-action="remove-letter" data-id="${id}" ${answered ? "disabled" : ""} aria-label="Remove ${esc(ui.letters.find((l) => l.id === id).letter)}">${esc(ui.letters.find((l) => l.id === id).letter === " " ? "␣" : ui.letters.find((l) => l.id === id).letter)}</button>`
    )
    .join("")
}
function updateBuilderTiles() {
  const area = document.querySelector(".built-word")
  if (!area) return
  area.innerHTML = builderWordMarkup()
  document
    .querySelectorAll(".letter-tiles [data-action=add-letter]")
    .forEach((b) => (b.disabled = ui.tiles.includes(Number(b.dataset.id))))
  const check = document.querySelector("[data-action=submit-builder]")
  if (check) check.disabled = !ui.tiles.length
  area.focus({ preventScroll: true })
  fitPractice()
}
function fitPractice() {
  const card = document.querySelector(".practice-question"),
    area = document.querySelector(".practice-content")
  if (!card || !area) return
  const size = Math.min(200, Math.max(48, area.clientHeight * 0.46))
  card.style.setProperty("--clue-size", size + "px")
  card.classList.remove("compact-practice")
  for (let i = 0; i < 5 && area.scrollHeight > area.clientHeight + 1; i++) {
    const current = parseFloat(card.style.getPropertyValue("--clue-size"))
    card.style.setProperty(
      "--clue-size",
      Math.max(30, current - (area.scrollHeight - area.clientHeight) - 8) + "px"
    )
    if (i >= 1) card.classList.add("compact-practice")
  }
}
/** @spec L2-UI-68, L2-UI-73, L2-UI-74, L2-UI-75 */
function renderPractice() {
  const s = state.session
  if (!s) {
    setView("home")
    return
  }
  if (s.finished && !ui.feedback) {
    renderResults(s)
    return
  }
  const t = ui.feedback?.task || taskState()
  if (!t) {
    renderResults(s)
    return
  }
  const response = ui.feedback?.response,
    retrying = !!response?.secondChance || (!response && !!t.attempts),
    answered = !!response && !response.secondChance
  const test = [
    "test",
    "weekly",
    "definition",
    "test-listen",
    "test-builder",
    "test-find",
  ].includes(s.mode)
  let kind = t.kind
  if (kind === "listen" && (!hasAudio() || ui.audioFallback))
    kind = "definition"
  const noListening =
      kind === "listen-write" && (!hasAudio() || ui.audioFallback),
    disabled = answered ? "disabled" : ""
  const label = {
    picture: "Find the picture",
    listen: "Listen closely",
    "listen-write": "Listen & Write",
    builder: "Build the word",
    definition: "Choose the word",
    write: "Write the word",
    card: "Turn a card",
  }[kind]
  const clue =
    t.word.definition.length > 100
      ? `<div class="definition long-clue">${esc(t.word.definition)}</div>${button("full-clue", "Read full clue", "text-button")}`
      : `<div class="definition">${esc(t.word.definition)}</div>`
  let copy =
    kind === "picture"
      ? `<h1>Find the picture for “${esc(t.word.word)}”.</h1>`
      : kind === "listen" || kind === "listen-write"
        ? `<div class="listen-symbol" aria-hidden="true">◖))</div><h1>Which word did you hear?</h1>${audioButton("hear-word", "Play the word")}`
        : kind === "card"
          ? ""
          : `${clue}${audioButton()}`
  let media = ["builder", "write"].includes(kind) || s.mode === "test-find"
    ? `<div class="question-image">${picture(t.word)}</div>`
    : ""
  let answers = ""
  if (kind === "card") {
    copy = ""
    answers = `<div class="flash-stage"><button type="button" class="flashcard ${ui.flipped ? "is-flipped" : ""}" data-action="flip-card" aria-pressed="${ui.flipped}" aria-label="${ui.flipped ? "Word. Turn to see the clue." : "Picture and definition. Turn to see the word."}"><span class="flashcard-inner"><span class="flash-face flash-front" aria-hidden="${ui.flipped}"><span class="flash-definition">${esc(t.word.definition)}</span><span class="question-image">${picture(t.word)}</span><small>Tap to turn the card</small></span><span class="flash-face flash-back" aria-hidden="${!ui.flipped}"><span class="word">${esc(t.word.word)}</span><small>Tap to see the clue</small></span></span></button></div><div class="flash-audio">${ui.flipped ? audioButton("hear-word", "Hear the word") : ""}</div>`
  } else if (kind === "builder") {
    answers = `<div class="built-word" tabindex="-1" aria-label="Your word">${builderWordMarkup(answered)}</div><div class="letter-tiles">${ui.letters.map((l) => `<button type="button" data-action="add-letter" data-id="${l.id}" ${answered || ui.tiles.includes(l.id) ? "disabled" : ""} aria-label="Add ${esc(l.letter === " " ? "space" : l.letter)}">${esc(l.letter === " " ? "␣" : l.letter)}</button>`).join("")}</div>`
  } else if (kind === "write" || kind === "listen-write") {
    answers = `<form class="answer-form" id="answerForm"><label for="answer">Your answer</label><input id="answer" type="text" maxlength="100" autocomplete="off" autocapitalize="off" spellcheck="false" value="${answered || retrying ? esc(response?.answer ?? t.firstWrong ?? "") : esc(ui.answerDraft || "")}" ${answered || noListening ? "disabled" : ""} aria-describedby="answerFeedback"></form>`
  } else if (kind === "picture") {
    answers = `<div class="choices picture-choices">${ui.options.map((w, i) => `<button type="button" class="choice picture ${answered ? (C.correct(t.word, w.word) ? "correct-answer" : w.word === response.answer ? "wrong-answer" : "") : retrying && w.word === (response?.answer ?? t.firstWrong) ? "wrong-answer" : ""}" data-action="answer-choice" data-index="${i}" ${disabled} aria-label="Picture ${i + 1}">${picture(w)}<span>Picture ${i + 1}</span></button>`).join("")}</div>`
  } else {
    if (t.kind === "listen" && kind === "definition" && !answered)
      ui.options = C.choices(
        t.word,
        state.buckets.find((b) => b.id === s.bucketId)
      )
    answers = `<h1 class="choice-title">Which word matches?</h1><div class="choices">${ui.options.map((word, i) => `<button type="button" class="choice ${answered ? (C.correct(t.word, word) ? "correct-answer" : word === response.answer ? "wrong-answer" : "") : retrying && word === (response?.answer ?? t.firstWrong) ? "wrong-answer" : ""}" data-action="answer-choice" data-index="${i}" ${disabled}>${esc(word)}</button>`).join("")}</div>`
  }
  const hint =
    ui.hint && !answered && !test
      ? [...t.word.word]
          .map((c, i) =>
            c === " " ? " / " : i < ui.hint ? esc(c.toUpperCase()) : "_"
          )
          .join(" ")
      : ""
  const message = retrying
    ? `Nice try! Start with <strong>${esc([...t.word.word.trim()][0].toUpperCase())}</strong>. Have another go.`
    : response
      ? response.correct
        ? "✓ Nice work!"
        : `A little practice helps. The word is <strong>${esc(response.word.word)}</strong>.`
      : hint
  const status = message
    ? `<span class="answer-reaction">${response ? shotScene(response.correct) : coach("encourage")}<span>${message}</span></span>`
    : ""
  const fallback = noListening
    ? '<p class="audio-fallback" role="status">Audio is unavailable. Replay the word, check voice settings, or choose another test.</p>'
    : ui.audioFallback
      ? '<p class="audio-fallback" role="status">Sound is unavailable. Here is a written clue instead.</p>'
      : ""
  const check =
    !answered && kind === "builder" && s.mode !== "test-builder"
      ? button(
          "submit-builder",
          "Check <kbd>Enter</kbd>",
          "secondary check-answer",
          ui.tiles.length ? "" : "disabled"
        )
      : !answered && ["write", "listen-write"].includes(kind)
        ? `<button type="submit" form="answerForm" class="secondary answer-submit check-answer" ${noListening ? "disabled" : ""}>Check <kbd>Enter</kbd></button>`
        : ""
  const next =
    kind === "card"
      ? button(
          "next-card",
          s.index === s.tasks.length - 1 ? "Finish →" : "Next →"
        )
      : button(
          "next",
          s.finished ? "See my results →" : "Next →",
          "primary",
          answered ? "" : "disabled"
        )
  $("app").innerHTML =
    `<div class="practice-shell in-session"><div class="practice-top"><div><div class="eyebrow">${labels[s.mode]} · ${esc(s.bucketName)}</div><p class="mini" style="margin:6px 0 0">${Math.min(s.index + (answered ? 0 : 1), s.tasks.length)} of ${s.tasks.length}${t.retry ? " · Another little try" : ""}</p></div>${button("pause", "Finish test", "text-button")}</div><div class="progress-track" role="progressbar" aria-label="Practice completed" aria-valuemin="0" aria-valuemax="${s.tasks.length}" aria-valuenow="${s.index}"><span style="width:${(s.index / s.tasks.length) * 100}%"></span></div><section class="card practice-question ${kind === "card" ? "is-flashcard" : ""}"><div class="practice-content"><div class="eyebrow">${label}</div>${fallback}${kind === "card" ? "" : `<div class="prompt-row ${media ? "has-picture" : ""}"><div class="prompt-copy">${copy}</div>${media ? `<div class="prompt-picture">${media}</div>` : ""}</div>`}<div class="answer-area">${answers}</div></div><div id="answerFeedback" class="feedback-strip ${retrying ? "retry" : response ? (response.correct ? "good" : "wrong") : ""}" role="status" aria-live="polite">${status}</div><div class="question-bottom"><div class="toolbar">${button("skip", "Skip word", "text-button", answered ? "disabled" : "")}${!answered && !test && !["card", "listen"].includes(kind) ? button("hint", "A little hint", "text-button") : ""}</div><div class="answer-actions">${check}${next}</div></div></section></div>`
  if (!answered && ["write", "listen-write"].includes(kind) && !noListening) {
    $("answer").focus({ preventScroll: true })
    if (retrying) $("answer").select()
  }
  const autoSpeakText = ["listen", "listen-write"].includes(kind)
    ? t.word.word
    : s.mode === "test-find" || s.mode === "definition"
      ? t.word.definition
      : null
  if (!answered && autoSpeakText && hasAudio() && ui.audioTaskKey !== ui.taskKey) {
    ui.audioTaskKey = ui.taskKey
    speak(autoSpeakText)
  }
}
async function submitAnswer(value, hint = ui.hint > 0) {
  const s = state.session
  if (!s || (ui.feedback && !ui.feedback.response.secondChance) || s.finished)
    return
  if (["write", "listen-write"].includes(s.tasks[s.index].kind) && !String(value || "").trim()) {
    const input = $("answer")
    input?.setAttribute("aria-invalid", "true")
    input?.focus({ preventScroll: true })
    $("answerFeedback").innerHTML = '<span class="form-error" role="alert">Enter a word before checking.</span>'
    return
  }
  const task = C.clone(s.tasks[s.index])
  let response
  await mutate((next) => (response = C.answer(next, value, hint)))
  stopAudio()
  ui.feedback = {
    task: response.secondChance
      ? C.clone(state.session.tasks[state.session.index])
      : task,
    response,
  }
  if (response.secondChance) ui.hint = Math.max(1, ui.hint)
  render()
}
async function skipCurrentWord() {
  if (
    !state.session ||
    state.session.finished ||
    (ui.feedback && !ui.feedback.response.secondChance)
  )
    return
  const word = state.session.tasks[state.session.index].word.word
  await mutate((next) => C.answer(next, "", false, { skip: true }))
  stopAudio()
  ui.feedback = null
  ui.taskKey = null
  ui.audioFallback = false
  render()
  toast("Word skipped. You can practise it later.")
}

async function flipCard() {
  if (ui.flipping || !state.session || state.session.finished) return
  const flip = !ui.flipped,
    sid = state.session.id,
    index = state.session.index
  if (flip && !state.session.tasks[index].exposed)
    await mutate((next) => {
      C.record(
        next,
        next.session.bucketId,
        next.session.tasks[index].word,
        "",
        false,
        true
      )
      next.session.tasks[index].exposed = true
    })
  if (
    ui.view !== "practice" ||
    state.session.id !== sid ||
    state.session.index !== index
  )
    return
  ui.flipped = flip
  ui.flipping = true
  const card = document.querySelector(".flashcard")
  if (card) {
    card.classList.toggle("is-flipped", flip)
    card.setAttribute("aria-pressed", String(flip))
    card.setAttribute(
      "aria-label",
      flip
        ? "Word. Turn to see the clue."
        : "Picture and definition. Turn to see the word."
    )
    card.querySelector(".flash-front").setAttribute("aria-hidden", String(flip))
    card.querySelector(".flash-back").setAttribute("aria-hidden", String(!flip))
  }
  const audio = document.querySelector(".flash-audio")
  if (audio)
    audio.innerHTML = flip ? audioButton("hear-word", "Hear the word") : ""
  setTimeout(
    () => {
      if (state.session?.id === sid && state.session.index === index)
        ui.flipping = false
    },
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420
  )
}
function renderResults(s) {
  const original = s.records.filter((r) => !r.retry),
    right = original.filter((r) => r.firstTryCorrect ?? r.correct).length,
    mistakes = original.filter((r) => !(r.firstTryCorrect ?? r.correct)),
    isCards = s.mode === "cards",
    earnedProgress = {
      "test-listen": 30,
      test: 60,
      "test-builder": 30,
      "test-find": 20,
      definition: 20,
    }[s.mode],
    rewardMessage =
      earnedProgress && !C.football.pending(state.football)
        ? `<p class="card-progress-result" role="status">Congratulations! You earned ${earnedProgress}% toward your next football card. You need ${100 - state.football.rewardPercent}% more to unlock it.</p>`
        : ""
  $("app").innerHTML =
    `${C.football.pending(state.football) ? rewardPanel() : ""}<section class="card practice-shell results"><div class="results-coach">${coach("celebrate")}</div><div class="eyebrow">${labels[s.mode]} complete</div><h1>${isCards ? "A little more familiar." : "Look at you grow."}</h1>${isCards ? `<p>${original.filter((r) => !r.skipped).length} words explored. Every little look counts.</p>` : `<div class="score">${right}<span class="muted" style="font-size:30px"> / ${original.length}</span></div><p>${right} correct on the first try${original.some((r) => r.hint) ? " · some with a hint" : ""}. ${mistakes.length ? "Let’s give the tricky ones a little care." : "A lovely little practice."}</p>`}${rewardMessage}<div class="toolbar">${mistakes.length ? button("practise-mistakes", "Practise tricky words") : ""}${button("repeat", "Practise again", "secondary")}${button("home", "Back to Tests", "secondary")}</div>${mistakes.length ? "<h2>Words to revisit</h2>" + mistakes.map(resultRow).join("") : ""}${!isCards ? `<details><summary>See all ${original.length} answers</summary>${original.map(resultRow).join("")}</details>` : ""}<p class="notice">Your progress is saved on this browser.</p></section>`
}
function resultRow(r) {
  return `<div class="result-row">${r.word.assetId ? picture(r.word) : ""}<div><h3>${esc(r.word.word)}</h3><p>${esc(r.word.definition)}</p><p>Your answer: ${esc(r.answer || "Skipped")}${r.hint ? " · hint used" : ""}</p></div><span class="pill ${r.correct ? "good" : "wrong"}">${r.correct ? "✓ Correct" : "Revisit"}</span></div>`
}
function renderParent() {
  const b = chosen(),
    attempts = state.attempts
      .filter((a) => a.bucketId === b.id)
      .slice()
      .reverse(),
    words = b.words.filter((w) =>
      C.norm(w.word + " " + w.definition).includes(C.norm(ui.search))
    )
  $("app").innerHTML =
    heading(
      "A little care behind the scenes",
      "Parent corner.",
      "Collections, progress and backups. Everything stays on this browser.",
      button("backup", "Export full backup", "secondary")
    ) +
    `<div class="parent-grid"><aside class="card parent-sidebar"><span class="label">WORD COLLECTIONS</span>${state.buckets.map((x) => `<button class="bucket-button ${x.id === b.id ? "active" : ""}" data-action="choose-collection" data-id="${esc(x.id)}">${esc(x.name)}<small>${x.words.length} words ${x.id === active().id ? "<span>· ACTIVE</span>" : ""}</small></button>`).join("")}${button("new-collection", "+ New collection", "text-button")}<hr class="divider"><p class="notice">One learner.<br>Progress is saved in this browser.</p>${button("about", "Use on a phone ↗", "text-button")}${button("voice-settings", "Voice & speaking speed", "text-button")}</aside><div class="parent-content"><section class="card"><div class="section-heading" style="margin-top:0"><div><div class="eyebrow">${b.id === active().id ? "Your active words" : "Word collection"}</div><h2>${esc(b.name)}</h2></div><div class="toolbar">${button("rename-collection", "Rename", "text-button")}${b.id !== active().id ? button("activate", "Use this collection", "secondary", b.words.length ? "" : "disabled") : ""}</div></div>${statusPills(b)}<div class="toolbar" style="margin-top:20px">${button("new-word", "+ Add a word")}${button("screenshot-word", "From screenshots", "secondary")}${button("practice-collection", "Practise →", "text-button")}</div><label for="wordSearch">Find a word</label><input id="wordSearch" class="word-search" type="search" placeholder="Search words and definitions" value="${esc(ui.search)}"><div id="wordList">${words.map(wordRow).join("") || '<p class="notice">No words here yet. Add your first little discovery.</p>'}</div><details><summary>Word progress</summary>${b.words
      .map((w) => {
        const p = C.progress(state, b.id, w.id)
        return `<div class="word-row"><div><strong>${esc(w.word)}</strong><p>${p.status} · ${p.mistakes} mistakes · next review ${p.due}</p></div></div>`
      })
      .join(
        ""
      )}</details><details><summary>Saved tests · ${attempts.length}</summary>${attempts.map((a) => `<button class="history-row" data-action="attempt" data-id="${esc(a.id)}"><span>${labels[a.type]}<small>${esc(new Date(a.date).toLocaleString("en-GB"))}</small></span><strong>${a.score} / ${a.responses.length} ↗</strong></button>`).join("") || '<p class="notice">No tests completed yet.</p>'}</details>${state.attempts.length || (state.session && ["test", "weekly", "definition", "test-listen", "test-builder", "test-find"].includes(state.session.mode)) ? button("clear-test-history", "Clear all saved test history", "text-button delete-link") : ""}<div class="backup-panel"><h3>A little safety net.</h3><p class="notice">Export a backup before moving devices or changing browsers. A full backup includes your pictures, original screenshots and test history.</p><div class="toolbar">${button("backup", "Export full backup", "secondary")}${button("import", "Import or restore", "secondary")}</div></div>${state.buckets.length > 1 ? button("delete-collection", "Delete this collection", "text-button delete-link") : ""}</section></div></div>`
}
function wordRow(w) {
  return `<div class="word-row">${w.assetId ? picture(w) : ""}<div><strong>${esc(w.word)}</strong><p>${esc(w.definition)}</p></div>${button("edit-word", "Edit", "secondary", `data-id="${esc(w.id)}"`)}</div>`
}
function showAbout() {
  modal(
    "A little garden, wherever you are.",
    `<p><strong>WordBloom</strong> is a small English-learning space for one child, with no ads or subscriptions.</p><h3>Computer and phone</h3><p>Open WordBloom from <strong>My apps</strong> in Backflip, or use the local development address <strong>http://localhost:3081/wordbloom</strong>.</p><div class="warning">Each browser keeps its own progress; phone and computer do not sync automatically. To move your progress, export a full backup on one device and choose <strong>Restore everything</strong> on the other. Keep a separate backup before replacing anything.</div><h3>Keep your words safe</h3><p>Pictures and history live in this browser’s IndexedDB storage. Clearing site data, private browsing or changing the site address can make saved data unavailable. Export regularly.</p><p class="notice">Internet is only needed for optional screenshot text recognition or externally linked pictures. Built-in words and pictures work offline while the page is available. Audio depends on your browser’s English voices. The Backflip version uses your sign-in; the local development version does not.</p><div class="dialog-actions">${button("backup", "Export full backup", "secondary")}${button("close-modal", "Got it")}</div>`
  )
}
function openEditor(id = null, screenshots = false) {
  const b = chosen(),
    w = b.words.find((w) => w.id === id)
  ui.edit = {
    bucketId: b.id,
    id,
    original: w ? C.clone(w) : null,
    newSource: null,
    wordSource: null,
    picture: null,
    crop: w?.crop ? C.clone(w.crop) : { x: 0, y: 0, w: 1, h: 1 },
    loading: false,
  }
  modal(
    w ? "Care for this word." : "Plant a new word.",
    `<form id="wordForm"><label for="wordInput">Word or phrase</label><input id="wordInput" required maxlength="100" value="${esc(w?.word)}" autocomplete="off"><label for="definitionInput">Short English definition</label><textarea id="definitionInput" required maxlength="1000" rows="3">${esc(w?.definition)}</textarea><div class="form-grid"><div><label for="aliasesInput">Other correct answers</label><input id="aliasesInput" value="${esc(w?.aliases?.join(", "))}" placeholder="e.g. beside"><p class="input-help">Separate synonyms with commas. They won’t appear as wrong choices.</p></div><div><label for="choicesInput">Alternative choices · optional</label><input id="choicesInput" value="${esc(w?.choices?.join(", "))}" placeholder="on, above, behind"></div></div><details ${screenshots ? "open" : ""}><summary>Picture & screenshots</summary>${w?.assetId ? `<img class="preview-image" src="${esc(assetMap.get(w.assetId)?.data || "")}" alt="Current word picture">` : ""}<label for="pictureFile">Upload a picture</label><input id="pictureFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><p class="input-help">PNG, JPEG, WebP or GIF · up to 12 MB. Stored once, separately from test history.</p><label for="imageUrl">Or use a picture URL</label><input id="imageUrl" type="url" placeholder="https://…"><label class="check-label"><input id="removePicture" type="checkbox"> Remove the current picture</label><hr class="divider"><h3>From screenshots</h3><p class="notice">Add a description-and-picture screenshot. An optional second screenshot can contain just the word. Type or review the text before saving.</p><label for="shotInput">Choose 1–2 screenshots</label><input id="shotInput" type="file" accept="image/png,image/jpeg,image/webp" multiple><div id="cropArea" hidden><label>Picture to keep · drag a rectangle or adjust the fields</label><canvas id="cropCanvas" class="screenshot-preview" style="max-height:none" aria-label="Picture crop preview"></canvas><div class="crop-grid">${[
      ["X", "Left", 0],
      ["Y", "Top", 0],
      ["W", "Width", 100],
      ["H", "Height", 100],
    ]
      .map(
        ([key, label, value]) =>
          `<div><label for="crop${key}">${label} %</label><input id="crop${key}" type="number" min="${["W", "H"].includes(key) ? 1 : 0}" max="100" value="${value}"></div>`
      )
      .join(
        ""
      )}</div><div class="toolbar" style="margin-top:12px">${button("full-crop", "Use full image", "secondary")}${button("ocr", "Read text from screenshots", "secondary")}</div><p id="ocrStatus" class="notice" role="status"></p><p class="input-help">Optional text recognition downloads its tools from the internet. Screenshots are processed in this browser. Crop out any printed answer.</p></div>${w?.sources?.description ? button("edit-original-crop", "Adjust crop from saved original", "secondary") : ""}${w?.sources ? `<details><summary>Original screenshots</summary><div class="source-images">${[...new Set([w.sources.description, w.sources.word].filter(Boolean))].map((id) => (assetMap.has(id) ? `<img src="${esc(assetMap.get(id).data)}" alt="Original screenshot">` : '<p class="warning">This original was not in the imported backup.</p>')).join("")}</div></details>` : ""}</details><div id="wordError" class="form-error" role="alert"></div><div class="dialog-actions">${w ? button("delete-word", "Delete word", "text-button delete-link", `data-id="${esc(w.id)}"`) : ""}${button("close-modal", "Cancel", "secondary")}<button type="submit" class="primary">Save word</button></div></form>`
  )
  ui.edit = ui.edit || {}
  if (screenshots) $("shotInput").focus()
}
function fileData(file, max = 12 * 1024 * 1024) {
  if (
    !file ||
    file.size > max ||
    !/^image\/(png|jpeg|webp|gif)$/.test(file.type)
  )
    return Promise.reject(
      Error("Choose a PNG, JPEG, WebP or GIF image under 12 MB.")
    )
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(Error("This file could not be read."))
    r.readAsDataURL(file)
  })
}
function imageFrom(data) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(Error("This picture could not be opened."))
    img.src = data
  })
}
async function loadCrop(data, name = "Original screenshot") {
  const edit = ui.edit
  if (!edit) return
  edit.loading = true
  try {
    const img = await imageFrom(data)
    if (ui.edit !== edit) return
    edit.newSource = { id: C.assetId(data), data, name }
    const scale = Math.min(
        1,
        1200 / img.naturalWidth,
        1200 / img.naturalHeight
      ),
      canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
    edit.canvas = canvas
    $("cropArea").hidden = false
    drawCrop()
  } finally {
    edit.loading = false
  }
}
function drawCrop() {
  const edit = ui.edit
  if (!edit?.canvas || !$("cropCanvas")) return
  const out = $("cropCanvas"),
    src = edit.canvas,
    c = edit.crop
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext("2d")
  ctx.drawImage(src, 0, 0)
  const x = c.x * out.width,
    y = c.y * out.height,
    w = c.w * out.width,
    h = c.h * out.height
  ctx.fillStyle = "#16392c66"
  ctx.fillRect(0, 0, out.width, y)
  ctx.fillRect(0, y + h, out.width, out.height - y - h)
  ctx.fillRect(0, y, x, h)
  ctx.fillRect(x + w, y, out.width - x - w, h)
  ctx.strokeStyle = "#da8b35"
  ctx.lineWidth = Math.max(3, out.width / 250)
  ctx.strokeRect(x, y, w, h)
  for (const key of ["X", "Y", "W", "H"])
    $("crop" + key).value = Math.round(c[key.toLowerCase()] * 100)
}
function croppedData(edit) {
  const { canvas, crop: c } = edit
  if (!canvas) return null
  const sx = c.x * canvas.width,
    sy = c.y * canvas.height,
    sw = c.w * canvas.width,
    sh = c.h * canvas.height,
    scale = Math.min(1, 800 / sw, 800 / sh),
    out = document.createElement("canvas")
  out.width = Math.max(1, Math.round(sw * scale))
  out.height = Math.max(1, Math.round(sh * scale))
  out
    .getContext("2d")
    .drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
  return out.toDataURL("image/jpeg", 0.88)
}
async function saveWord() {
  const edit = ui.edit
  if (!edit) return
  if (edit.loading) throw Error("Wait for the picture to finish opening.")
  const word = $("wordInput").value.trim(),
    definition = $("definitionInput").value.trim(),
    b = state.buckets.find((b) => b.id === edit.bucketId)
  if (b.words.some((w) => w.id !== edit.id && C.norm(w.word) === C.norm(word)))
    throw Error("This word already exists in the collection. Edit it instead.")
  const split = (id) =>
    $(id)
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  const w = {
      ...(edit.original || {}),
      id: edit.id || C.uid(),
      word,
      definition,
      aliases: split("aliasesInput"),
      choices: split("choicesInput"),
    },
    pictures = []
  let data = edit.picture || croppedData(edit) || $("imageUrl").value.trim()
  if ($("imageUrl").value.trim()) data = $("imageUrl").value.trim()
  if (data) {
    if (!C.validImage(data))
      throw Error("Use an http or https picture URL, or a supported image.")
    const id = C.assetId(data)
    pictures.push({ id, data, name: word })
    w.assetId = id
    delete w.scene
  }
  if (edit.newSource) {
    pictures.push(edit.newSource)
    if (edit.wordSource) pictures.push(edit.wordSource)
    w.sources = {
      description: edit.newSource.id,
      ...(edit.wordSource
        ? { word: edit.wordSource.id }
        : edit.original?.sources?.word
          ? { word: edit.original.sources.word }
          : {}),
      layout: edit.wordSource ? "pair" : "combined",
    }
    w.crop = { ...edit.crop, sourceId: edit.newSource.id }
  }
  if ($("removePicture").checked) {
    delete w.assetId
    delete w.scene
  }
  const clean = C.normalizeWord(w)
  await mutate((next) => {
    const target = next.buckets.find((b) => b.id === edit.bucketId)
    if (edit.id)
      target.words[target.words.findIndex((x) => x.id === edit.id)] = clean
    else target.words.push(clean)
  }, C.normalizeAssets(pictures))
  closeModal()
  render()
  toast("Word saved. A little more room to grow.")
}
async function loadOCR() {
  if (window.Tesseract) return
  if (ocrPromise) return ocrPromise
  ocrPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js"
    const timer = setTimeout(() => {
      script.remove()
      ocrPromise = null
      reject(
        Error(
          "Text recognition could not load. You can still type the word and definition."
        )
      )
    }, 20000)
    script.onload = () => {
      clearTimeout(timer)
      resolve()
    }
    script.onerror = () => {
      clearTimeout(timer)
      script.remove()
      ocrPromise = null
      reject(Error("Text recognition is offline. You can still type the text."))
    }
    document.head.appendChild(script)
  })
  return ocrPromise
}
async function readScreenshots() {
  const edit = ui.edit
  if (!edit?.newSource || edit.loading) return
  edit.loading = true
  const beforeWord = $("wordInput").value,
    beforeDefinition = $("definitionInput").value
  let worker, timer
  const status = (message) => {
    if (ui.edit === edit && $("ocrStatus")) $("ocrStatus").textContent = message
  }
  try {
    status("Loading text recognition…")
    await loadOCR()
    if (ui.edit !== edit) return
    const work = (async () => {
      worker = await Tesseract.createWorker("eng", 1, {
        workerPath:
          "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0",
        logger: (m) => {
          if (m.status === "recognizing text")
            status("Reading… " + Math.round(m.progress * 100) + "%")
        },
      })
      if (ui.edit !== edit) {
        await worker.terminate()
        return
      }
      ocrWorker = worker
      await worker.setParameters({ tessedit_pageseg_mode: "11" })
      const description = await worker.recognize(edit.newSource.data)
      const word = edit.wordSource
        ? await worker.recognize(edit.wordSource.data)
        : null
      const clean = (s) =>
        s
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(
            (x) =>
              x &&
              !/^(flashcards?|learn|test|next|previous|get a hint|show answer)$/i.test(
                x
              )
          )
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      if (ui.edit !== edit) return
      if (!beforeDefinition && !$("definitionInput").value)
        $("definitionInput").value = clean(description.data.text).slice(0, 1000)
      if (word && !beforeWord && !$("wordInput").value)
        $("wordInput").value = clean(word.data.text).slice(0, 100)
      status(
        "Text read. Please check both fields and crop out the printed answer before saving."
      )
    })()
    await Promise.race([
      work,
      new Promise(
        (_, reject) =>
          (timer = setTimeout(
            () =>
              reject(
                Error(
                  "Text recognition took too long. Please type the text instead."
                )
              ),
            60000
          ))
      ),
    ])
  } catch (e) {
    status(
      e.message || "Text recognition is unavailable. Please type the text."
    )
  } finally {
    clearTimeout(timer)
    if (worker) await worker.terminate().catch(() => {})
    if (ocrWorker === worker) ocrWorker = null
    edit.loading = false
  }
}
async function backup() {
  const data = {
    format: "wordbloom-v3",
    exportedAt: new Date().toISOString(),
    state: C.clone(state),
    assets: await Store.assets(),
  }
  download(data, "wordbloom-full-backup-" + C.today() + ".json")
  toast("Backup downloaded. Keep it somewhere safe.")
}
function download(data, name) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data)], { type: "application/json" })
    ),
    a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function readBackup(file) {
  if (!file) return
  if (file.size > 120 * 1024 * 1024)
    throw Error("This backup is too large (maximum 120 MB).")
  let value
  try {
    value = JSON.parse(await file.text())
  } catch {
    throw Error("This is not a readable JSON backup. Nothing has changed.")
  }
  const incoming = C.decodeBackup(value, window.WORDBLOOM_SEED.sources),
    wordCount = incoming.state.buckets.reduce((n, b) => n + b.words.length, 0)
  ui.import = incoming
  modal(
    "Your backup is ready.",
    `<p><strong>${incoming.state.buckets.length} collections · ${wordCount} words · ${incoming.state.attempts.length} saved tests</strong></p>${incoming.legacy ? '<p class="notice">This is a Little Word Garden backup. Its words, pictures, progress and saved tests will be converted for WordBloom.</p>' : ""}${incoming.warnings?.length ? `<p class="warning">${esc(incoming.warnings.join(" "))}</p>` : ""}<div class="grid-2"><section><h3>Add missing items</h3><p class="notice">Keep your current words and progress. Add words and test attempts with new IDs. Existing entries win when the same ID exists.</p>${button("merge-import", "Add missing items", "secondary", state ? "" : "disabled")}</section><section><h3>Restore everything</h3><p class="notice">Replace this browser’s WordBloom data with the backup, including edits and unfinished practice. Export your current data first.</p><label class="check-label"><input id="confirmRestore" type="checkbox"> I understand this replaces current data</label>${button("restore-import", "Restore everything", "danger")}</section></div><div class="dialog-actions">${button("backup", "Export current backup", "secondary", state ? "" : "disabled")}${button("close-modal", "Cancel", "secondary")}</div>`
  )
  ui.import = incoming
}
async function legacyImport() {
  let buckets, learning
  try {
    buckets = JSON.parse(
      localStorage.getItem("little-word-garden-v1") || "null"
    )
    learning = JSON.parse(
      localStorage.getItem("little-word-garden-learning-v2") || "null"
    )
  } catch {
    throw Error(
      "The old browser data cannot be read. Import an exported backup instead."
    )
  }
  if (!buckets)
    throw Error(
      "No old Word Garden data is visible at this address. Export a full backup from the old app, then import that JSON here."
    )
  let sources = { ...window.WORDBLOOM_SEED.sources }
  if (indexedDB.databases) {
    try {
      const list = await indexedDB.databases()
      if (list.some((db) => db.name === "little-word-garden-sources")) {
        const records = await new Promise((resolve, reject) => {
          const r = indexedDB.open("little-word-garden-sources")
          r.onerror = () => reject(r.error)
          r.onsuccess = () => {
            const db = r.result,
              request = db
                .transaction("sources")
                .objectStore("sources")
                .getAll()
            request.onsuccess = () => {
              resolve(request.result)
              db.close()
            }
            request.onerror = () => {
              reject(request.error)
              db.close()
            }
          }
        })
        for (const a of records) sources[a.id] = a
      }
    } catch {}
  }
  const data = { buckets, sources, ...(learning ? { learning } : {}) }
  await readBackup(
    new File([JSON.stringify(data)], "previous-word-garden.json", {
      type: "application/json",
    })
  )
}
function confirmDialog(title, body, action, extra = "") {
  modal(
    title,
    `<p>${body}</p><div class="dialog-actions">${button("close-modal", "Keep it", "secondary")}${button(action, "Yes, continue", "danger", extra)}</div>`
  )
}
async function action(name, el) {
  const d = el.dataset
  switch (name) {
    case "team":
      setView("team")
      break
    case "team-filter":
      ui.teamRole = d.role
      render()
      break
    case "show-reward":
      document
        .querySelector(".reward-panel")
        ?.scrollIntoView({ block: "start", behavior: "smooth" })
      break
    case "claim-player": {
      const id = d.id
      await mutate((next) => C.football.claim(next.football, d.reward, id))
      ui.view = "team"
      render()
      toast(C.football.byId[id].name + " joined your club!")
      break
    }
    case "player-detail":
      playerDetail(d.id)
      break
    case "pitch-slot":
      pickPosition(d.slot)
      break
    case "assign-player":
      await mutate((next) => C.football.assign(next.football, d.slot, d.id))
      closeModal()
      render()
      toast("Starting eleven updated.")
      break
    case "clear-position":
      await mutate((next) => delete next.football.lineup[d.slot])
      closeModal()
      render()
      break
    case "captain":
      await mutate((next) => {
        if (!C.football.ownedIds(next.football).includes(d.id))
          throw Error("Collect this player first.")
        next.football.captain = d.id
      })
      closeModal()
      render()
      toast("Your captain is ready.")
      break
    case "rename-team":
      modal(
        "Name your team.",
        `<form id="teamForm"><label for="teamName">Team name</label><input id="teamName" maxlength="40" required value="${esc(state.football.teamName)}"><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}<button type="submit" class="primary">Save team name</button></div></form>`
      )
      break
    case "reset-football":
      modal(
        "Reset your football collection?",
        `<p>This clears collected players, pending card choices, your lineup, captain and football-card progress. Your words, learning progress and test history stay as they are.</p><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}${button("confirm-reset-football", "Reset collection", "danger")}</div>`
      )
      break
    case "confirm-reset-football":
      await mutate((next) => {
        next.football = C.football.fresh()
      })
      closeModal()
      ui.view = "team"
      render()
      toast(
        "Football collection reset. Take a test to earn your first card."
      )
      break
    case "home":
      setView("home")
      break
    case "review":
      setView("review-home")
      break
    case "test-home":
      if ($("modal").open) closeModal()
      setView("test-home")
      break
    case "parent":
      setView("parent")
      break
    case "about":
      showAbout()
      break
    case "close-modal":
      closeModal()
      break
    case "clear-test-history":
      confirmDialog(
        "Clear saved test history?",
        "This removes every saved test score and any unfinished test. Your words, learning progress, pictures, collected football cards and reward meter stay as they are.",
        "confirm-clear-test-history"
      )
      break
    case "confirm-clear-test-history": {
      const removed = state.attempts.length
      await mutate((next) => {
        next.attempts = []
        if (
          next.session &&
          [
            "test",
            "weekly",
            "definition",
            "test-listen",
            "test-builder",
            "test-find",
          ].includes(next.session.mode)
        )
          next.session = null
      })
      closeModal()
      ui.view = "parent"
      render()
      toast(
        `${removed} saved test${removed === 1 ? "" : "s"} cleared. Your learning data, football collection and reward meter are unchanged.`
      )
      break
    }
    case "start-selected": {
      const mode = $("testKind")?.value || d.mode,
        bucketId = $("startBucket")?.value || active().id,
        count = state.attempts.filter(
          (attempt) => attempt.bucketId === bucketId && attempt.type === mode
        ).length
      if (count > 10 && ["test", "test-listen", "test-builder", "test-find", "definition"].includes(mode)) {
        const remaining = testLockRemaining(bucketId, mode)
        if (remaining <= 0) {
          try {
            localStorage.setItem(testLockKey(bucketId, mode), String(Date.now() + TEST_LOCK_MS))
          } catch {}
        }
        const lockedMinutes = Math.ceil(
          Math.max(remaining, TEST_LOCK_MS) / 60000
        )
        render()
        modal(
          "Brilliant work!",
          `<p>You’ve completed this test ${count} times. Choose another test for now; this one will unlock in ${lockedMinutes} minute${lockedMinutes === 1 ? "" : "s"}.</p><div class="dialog-actions">${button("close-modal", "Choose another test")}</div>`
        )
        break
      }
      await begin(mode, bucketId)
      break
    }
    case "pause":
      stopAudio()
      await mutate((next) => {
        next.session = null
      })
      setView("home")
      toast("Test closed. Choose a new test whenever you’re ready.")
      break
    case "answer-choice": {
      const t = taskState(),
        option = ui.options[Number(d.index)]
      await submitAnswer(t.kind === "picture" ? option.word : option)
      break
    }
    case "submit-builder":
      await submitAnswer(
        ui.tiles
          .map((id) => ui.letters.find((l) => l.id === id).letter)
          .join("")
      )
      break
    case "skip":
      await skipCurrentWord()
      break
    case "full-clue": {
      const task = ui.feedback?.task || taskState()
      modal(
        "Read the clue.",
        `<p>${esc(task.word.definition)}</p><div class="dialog-actions">${button("close-modal", "Back to the word")}</div>`
      )
      break
    }
    case "next":
      nextTask()
      break
    case "hint": {
      const t = taskState()
      if (t) {
        ui.hint++
        render()
      }
      break
    }
    case "add-letter":
      if (!ui.tiles.includes(Number(d.id))) ui.tiles.push(Number(d.id))
      updateBuilderTiles()
      if (
        ui.view === "practice" &&
        state.session?.mode === "test-builder" &&
        ui.tiles.length === ui.letters.length
      ) {
        await submitAnswer(
          ui.tiles
            .map((id) => ui.letters.find((letter) => letter.id === id).letter)
            .join("")
        )
      }
      break
    case "remove-letter":
      ui.tiles = ui.tiles.filter((id) => id !== Number(d.id))
      updateBuilderTiles()
      break
    case "flip-card":
      await flipCard()
      break
    case "next-card": {
      const t = taskState()
      if (!t) return
      await mutate((next) => C.answer(next, t.word.word, false))
      stopAudio()
      ui.taskKey = null
      ui.feedback = null
      render()
      break
    }
    case "voice-settings":
      voiceSettings()
      break
    case "preview-voice":
      speak(
        "A little word, a new discovery. Listen carefully. Flower. Between. Shoes.",
        true
      )
      break
    case "hear-word": {
      const t = ui.feedback?.task || taskState()
      if (t) speak(t.word.word)
      break
    }
    case "hear-clue": {
      const t = ui.feedback?.task || taskState()
      if (t) speak(t.word.definition)
      break
    }
    case "practise-mistakes": {
      const old = C.clone(state.session),
        words = [
          ...new Map(
            old.records
              .filter((r) => !r.correct && !r.retry)
              .map((r) => [r.word.id, r.word])
          ).values(),
        ]
      await mutate((next) => {
        C.launch(next, "review", old.bucketId, { audio: hasAudio() })
        next.session.tasks = words.map((w) => ({
          kind: "write",
          word: w,
          retry: false,
        }))
      })
      ui.feedback = null
      ui.taskKey = null
      setView("practice")
      break
    }
    case "repeat": {
      const s = state.session
      await launch(s.mode, s.bucketId, s.missionDate)
      break
    }
    case "choose-collection":
      ui.selected = d.id
      ui.search = ""
      render()
      break
    case "practice-collection":
      ui.selected = chosen().id
      setView("review-home")
      break
    case "activate":
      await mutate((next) => {
        next.settings.activeBucketId = chosen().id
      })
      render()
      toast("Your active words are ready.")
      break
    case "new-collection":
      modal(
        "Room for new discoveries.",
        `<form id="collectionForm"><label for="collectionName">Collection name</label><input id="collectionName" required maxlength="150" placeholder="e.g. Animals around us"><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}<button class="primary" type="submit">Create collection</button></div><p id="collectionError" class="form-error" role="alert"></p></form>`
      )
      break
    case "rename-collection":
      modal(
        "A new name.",
        `<form id="renameForm"><label for="collectionName">Collection name</label><input id="collectionName" required maxlength="150" value="${esc(chosen().name)}"><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}<button class="primary" type="submit">Save name</button></div><p id="collectionError" class="form-error" role="alert"></p></form>`
      )
      break
    case "delete-collection":
      confirmDialog(
        "Remove this collection?",
        `Delete “${esc(chosen().name)}”, its words, progress and saved tests? Other collections stay safe. Export a backup first if you might want this collection back.`,
        "confirm-delete-collection",
        `data-id="${esc(chosen().id)}"`
      )
      break
    case "confirm-delete-collection": {
      if (state.buckets.length <= 1)
        throw Error("Keep at least one collection.")
      const id = d.id
      await mutate((next) => {
        next.buckets = next.buckets.filter((b) => b.id !== id)
        next.attempts = next.attempts.filter((a) => a.bucketId !== id)
        delete next.weeks[id]
        for (const domain of ["progress", "missions"])
          for (const k of Object.keys(next[domain])) {
            try {
              if (JSON.parse(k)[0] === id) delete next[domain][k]
            } catch {}
          }
        if (next.session?.bucketId === id) next.session = null
        if (next.settings.activeBucketId === id)
          next.settings.activeBucketId = next.buckets[0].id
      })
      ui.selected = active().id
      closeModal()
      render()
      break
    }
    case "new-word":
      openEditor()
      break
    case "screenshot-word":
      openEditor(null, true)
      break
    case "edit-word":
      openEditor(d.id)
      break
    case "delete-word":
      confirmDialog(
        "Remove this word?",
        `Delete “${esc(ui.edit?.original?.word)}” from this collection? Saved tests keep their original answers.`,
        "confirm-delete-word",
        `data-id="${esc(d.id)}" data-bid="${esc(ui.edit.bucketId)}"`
      )
      break
    case "confirm-delete-word":
      await mutate((next) => {
        next.buckets.find((b) => b.id === d.bid).words = next.buckets
          .find((b) => b.id === d.bid)
          .words.filter((w) => w.id !== d.id)
        delete next.progress[C.key(d.bid, d.id)]
      })
      closeModal()
      render()
      break
    case "full-crop":
      if (ui.edit) {
        ui.edit.crop = { x: 0, y: 0, w: 1, h: 1 }
        drawCrop()
      }
      break
    case "edit-original-crop": {
      const edit = ui.edit,
        source = assetMap.get(edit.original?.sources?.description)
      if (!source)
        throw Error(
          "Original screenshot unavailable. Import its full backup first."
        )
      await loadCrop(source.data, source.name)
      if (edit.original.sources.word)
        edit.wordSource = assetMap.get(edit.original.sources.word)
      break
    }
    case "ocr":
      await readScreenshots()
      break
    case "backup":
      await backup()
      break
    case "import":
      modal(
        "Bring your words along.",
        `<p>Choose a full WordBloom backup or a Little Word Garden JSON export. Nothing changes until you review the backup and choose an import option.</p><div class="toolbar">${button("pick-backup", "Choose backup file")}${button("import-old", "Check old browser data", "secondary")}</div><p class="notice">If the old app uses another address or opens as a different HTML file, export its full backup and import the downloaded file here.</p><div class="dialog-actions">${button("close-modal", "Cancel", "secondary")}</div>`
      )
      break
    case "pick-backup":
      $("backupFile").click()
      break
    case "import-old":
      await legacyImport()
      break
    case "merge-import": {
      const incoming = ui.import
      const merged = C.mergeData(state, incoming, await Store.assets())
      await commitImport(merged)
      break
    }
    case "restore-import":
      if (!$("confirmRestore").checked)
        throw Error("Tick the confirmation before replacing current data.")
      await commitImport(ui.import)
      break
    case "attempt": {
      const a = state.attempts.find((a) => a.id === d.id)
      modal(
        `${labels[a.type]} · ${a.score} / ${a.responses.length}`,
        `<p class="notice">${esc(a.bucketName)} · ${esc(new Date(a.date).toLocaleString("en-GB"))}</p>${a.responses.map(resultRow).join("")}<div class="dialog-actions">${button("close-modal", "Close")}</div>`
      )
      break
    }
    case "recovery-export":
      download(
        await Store.rawBackup(),
        "wordbloom-recovery-" + C.today() + ".json"
      )
      break
    case "recovery-import":
      $("backupFile").click()
      break
    case "reload":
      location.reload()
      break
  }
}
async function run(fn, errorTarget) {
  if (busy) return
  busy = true
  $("app").setAttribute("aria-busy", "true")
  try {
    await fn()
  } catch (e) {
    if (errorTarget && $(errorTarget)) $(errorTarget).textContent = e.message
    else if ($("modal").open) {
      let target = $("modalError")
      if (!target) {
        target = document.createElement("p")
        target.id = "modalError"
        target.className = "form-error"
        target.setAttribute("role", "alert")
        $("modalContent").appendChild(target)
      }
      target.textContent = e.message
    } else saveError(e)
  } finally {
    busy = false
    $("app").setAttribute("aria-busy", "false")
  }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]")
  if (!el || el.disabled) return
  run(() => action(el.dataset.action, el))
})
document.addEventListener("submit", (e) => {
  e.preventDefault()
  const id = e.target.id
  if (id === "teamForm")
    run(async () => {
      const name = $("teamName").value.trim()
      if (!name) throw Error("Give your team a name.")
      await mutate((next) => (next.football.teamName = name))
      closeModal()
      render()
    })
  else if (id === "voiceForm")
    run(async () => {
      await mutate((next) => {
        next.settings.voiceURI = $("voiceSelect").value
        next.settings.speechRate = Number($("speechRate").value)
      })
      closeModal()
      toast("Voice settings saved.")
    })
  else if (id === "answerForm") run(() => submitAnswer($("answer").value))
  else if (id === "wordForm") run(saveWord, "wordError")
  else if (id === "collectionForm" || id === "renameForm")
    run(async () => {
      const name = $("collectionName").value.trim()
      if (!name) throw Error("Give your collection a name.")
      let selected
      await mutate((next) => {
        if (id === "renameForm")
          next.buckets.find((b) => b.id === chosen().id).name = name
        else {
          selected = C.uid()
          next.buckets.push({ id: selected, name, words: [] })
        }
      })
      if (selected) ui.selected = selected
      closeModal()
      render()
    }, "collectionError")

})
document.addEventListener("input", (e) => {
  if (e.target.id === "answer") {
    ui.answerDraft = e.target.value
    e.target.removeAttribute("aria-invalid")
    $("answerFeedback").textContent = ""
  }
  if (e.target.id === "wordSearch") {
    ui.search = e.target.value
    $("wordList").innerHTML =
      chosen()
        .words.filter((w) =>
          C.norm(w.word + " " + w.definition).includes(C.norm(ui.search))
        )
        .map(wordRow)
        .join("") || '<p class="notice">No matching words.</p>'
  }
  if (/^crop[XYWH]$/.test(e.target.id) && ui.edit?.canvas) {
    const value = (k) =>
        Math.max(0, Math.min(100, Number($("crop" + k).value) || 0)) / 100,
      x = Math.min(0.99, value("X")),
      y = Math.min(0.99, value("Y"))
    ui.edit.crop = {
      x,
      y,
      w: Math.max(0.01, Math.min(1 - x, value("W"))),
      h: Math.max(0.01, Math.min(1 - y, value("H"))),
    }
    drawCrop()
  }
})
document.addEventListener("change", (e) => {
  if (e.target.id === "backupFile") {
    const file = e.target.files[0]
    e.target.value = ""
    run(() => readBackup(file))
  } else if (e.target.id === "pictureFile") {
    const file = e.target.files[0],
      edit = ui.edit
    if (file)
      run(async () => {
        const data = await fileData(file)
        if (ui.edit !== edit) return
        edit.picture = data
        $("removePicture").checked = false
        toast("Picture ready. Save the word to keep it.")
      }, "wordError")
  } else if (e.target.id === "shotInput") {
    const files = [...e.target.files],
      edit = ui.edit
    if (!files.length) return
    run(async () => {
      if (files.length > 2)
        throw Error(
          "Choose one description screenshot and optionally one word screenshot."
        )
      const data = await Promise.all(files.map((f) => fileData(f)))
      if (ui.edit !== edit) return
      edit.crop = { x: 0, y: 0, w: 1, h: 1 }
      edit.picture = null
      await loadCrop(data[0], files[0].name)
      if (data[1])
        edit.wordSource = {
          id: C.assetId(data[1]),
          data: data[1],
          name: files[1].name,
        }
      else edit.wordSource = null
      $("removePicture").checked = false
    }, "wordError")
  }
})
let cropStart = null
function cropPoint(e) {
  const rect = $("cropCanvas").getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(0.99, (e.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(0.99, (e.clientY - rect.top) / rect.height)),
  }
}
document.addEventListener("pointerdown", (e) => {
  if (e.target.id !== "cropCanvas" || !ui.edit?.canvas) return
  cropStart = cropPoint(e)
  e.target.setPointerCapture(e.pointerId)
})
document.addEventListener("pointermove", (e) => {
  if (!cropStart || e.target.id !== "cropCanvas" || !ui.edit) return
  const p = cropPoint(e)
  ui.edit.crop = {
    x: Math.min(p.x, cropStart.x),
    y: Math.min(p.y, cropStart.y),
    w: Math.max(0.01, Math.abs(p.x - cropStart.x)),
    h: Math.max(0.01, Math.abs(p.y - cropStart.y)),
  }
  drawCrop()
})
document.addEventListener("pointerup", () => (cropStart = null))
document.addEventListener("pointercancel", () => (cropStart = null))
$("modal").addEventListener("cancel", (e) => {
  if (busy) {
    e.preventDefault()
    return
  }
  e.preventDefault()
  closeModal()
})
document.addEventListener("keydown", (e) => {
  if (
    ui.view !== "practice" ||
    $("modal").open ||
    busy ||
    e.repeat ||
    e.isComposing ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey
  )
    return
  if (e.key === "Enter" && ui.feedback && !ui.feedback.response.secondChance) {
    e.preventDefault()
    run(async () => nextTask())
    return
  }
  if (ui.feedback && !ui.feedback.response.secondChance) return
  const t = taskState()
  if (!t) return
  if (t.kind === "card" && (e.key === "Enter" || e.key === "ArrowRight")) {
    e.preventDefault()
    run(() =>
      action(e.key === "ArrowRight" || ui.flipped ? "next-card" : "flip-card", {
        dataset: {},
      })
    )
    return
  }
  if (t.kind === "builder") {
    if (e.key === "Enter" && ui.tiles.length) {
      e.preventDefault()
      run(() => action("submit-builder", { dataset: {} }))
      return
    }
    if (e.key === "Backspace" && ui.tiles.length) {
      e.preventDefault()
      run(() =>
        action("remove-letter", { dataset: { id: String(ui.tiles.at(-1)) } })
      )
      return
    }
    if (e.key.length === 1) {
      const letter = ui.letters.find(
        (l) => l.letter === e.key.toUpperCase() && !ui.tiles.includes(l.id)
      )
      if (letter) {
        e.preventDefault()
        run(() => action("add-letter", { dataset: { id: String(letter.id) } }))
      }
    }
  }
})
window.addEventListener("pagehide", () => {
  stopAudio()
})
window.addEventListener("popstate", () => {
  if (ui.view !== "practice" || !state?.session) return
  stopAudio()
  run(async () => {
    await mutate((next) => {
      next.session = null
    })
    ui.feedback = null
    ui.taskKey = null
    setView("test-home")
  })
})
function updatePracticeViewport() {
  document.documentElement.style.setProperty(
    "--practice-viewport",
    (window.visualViewport?.height || innerHeight) + "px"
  )
  document.documentElement.style.setProperty(
    "--practice-chrome",
    document.querySelector(".site-header").getBoundingClientRect().height +
      36 +
      "px"
  )
  fitPractice()
}
window.visualViewport?.addEventListener("resize", updatePracticeViewport)
window.addEventListener("resize", updatePracticeViewport)

async function init() {
  try {
    const stored = await Store.open()
    if (stored) {
      state = C.normalizeState(stored)
      assetMap = new Map((await Store.assets()).map((a) => [a.id, a]))
    } else {
      const initial = C.decodeBackup(
        window.WORDBLOOM_SEED,
        window.WORDBLOOM_SEED.sources
      )
      await Store.commit(initial.state, initial.assets)
      state = initial.state
      assetMap = new Map(initial.assets.map((a) => [a.id, a]))
    }
    ui.selected = active().id
    render()
  } catch (e) {
    $("app").innerHTML =
      heading(
        "Your data comes first",
        "Let’s keep your words safe.",
        "WordBloom could not open its saved data. Nothing has been overwritten."
      ) +
      `<section class="card"><p class="warning">${esc(e.message)}</p><p>Try a regular browser window and open WordBloom again from Backflip. If saved data needs repair, download a recovery copy first, then restore a known full backup.</p><div class="toolbar">${button("recovery-export", "Download recovery data", "secondary")}${button("recovery-import", "Restore a full backup", "secondary")}${button("reload", "Try again", "primary")}</div><p class="notice">No saved data is deleted automatically.</p></section>`
    $("app").setAttribute("aria-busy", "false")
  }
}
if (window.WORD_BLOOM_MOUNT_MANAGED) {
  window.addEventListener("wordbloom:mount", init)
} else {
  init()
}
