/* Player names and broad squad roles, not rankings or live club affiliations.
 * @spec L2-UI-69, L2-UI-75
 */
;(function (root, factory) {
  const api = factory()
  if (typeof module === "object" && module.exports) module.exports = api
  else root.BloomFootball = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const players = [
    {
      id: "ronaldo",
      name: "Cristiano Ronaldo",
      country: "Portugal",
      role: "FW",
      atlas: 1,
      tile: 0,
    },
    {
      id: "messi",
      name: "Lionel Messi",
      country: "Argentina",
      role: "FW",
      atlas: 1,
      tile: 1,
    },
    {
      id: "yamal",
      name: "Lamine Yamal",
      country: "Spain",
      role: "FW",
      atlas: 1,
      tile: 2,
    },
    {
      id: "vinicius",
      name: "Vinícius Júnior",
      country: "Brazil",
      role: "FW",
      atlas: 1,
      tile: 3,
    },
    {
      id: "emi-martinez",
      name: "Emiliano Martínez",
      country: "Argentina",
      role: "GK",
      atlas: 1,
      tile: 4,
    },
    {
      id: "mbappe",
      name: "Kylian Mbappé",
      country: "France",
      role: "FW",
      atlas: 1,
      tile: 5,
    },
    {
      id: "haaland",
      name: "Erling Haaland",
      country: "Norway",
      role: "FW",
      atlas: 1,
      tile: 6,
    },
    {
      id: "salah",
      name: "Mohamed Salah",
      country: "Egypt",
      role: "FW",
      atlas: 1,
      tile: 7,
    },
    {
      id: "kane",
      name: "Harry Kane",
      country: "England",
      role: "FW",
      atlas: 1,
      tile: 8,
    },
    {
      id: "saka",
      name: "Bukayo Saka",
      country: "England",
      role: "FW",
      atlas: 1,
      tile: 9,
    },
    {
      id: "raphinha",
      name: "Raphinha",
      country: "Brazil",
      role: "FW",
      atlas: 1,
      tile: 10,
    },
    {
      id: "dembele",
      name: "Ousmane Dembélé",
      country: "France",
      role: "FW",
      atlas: 1,
      tile: 11,
    },
    {
      id: "bellingham",
      name: "Jude Bellingham",
      country: "England",
      role: "MF",
      atlas: 1,
      tile: 12,
    },
    {
      id: "rodri",
      name: "Rodri",
      country: "Spain",
      role: "MF",
      atlas: 1,
      tile: 13,
    },
    {
      id: "pedri",
      name: "Pedri",
      country: "Spain",
      role: "MF",
      atlas: 1,
      tile: 14,
    },
    {
      id: "van-dijk",
      name: "Virgil van Dijk",
      country: "Netherlands",
      role: "DF",
      atlas: 1,
      tile: 15,
    },
    {
      id: "alisson",
      name: "Alisson Becker",
      country: "Brazil",
      role: "GK",
      atlas: 2,
      tile: 0,
    },
    {
      id: "courtois",
      name: "Thibaut Courtois",
      country: "Belgium",
      role: "GK",
      atlas: 2,
      tile: 1,
    },
    {
      id: "donnarumma",
      name: "Gianluigi Donnarumma",
      country: "Italy",
      role: "GK",
      atlas: 2,
      tile: 2,
    },
    {
      id: "ederson",
      name: "Ederson",
      country: "Brazil",
      role: "GK",
      atlas: 2,
      tile: 3,
    },
    {
      id: "raya",
      name: "David Raya",
      country: "Spain",
      role: "GK",
      atlas: 2,
      tile: 4,
    },
    {
      id: "dias",
      name: "Rúben Dias",
      country: "Portugal",
      role: "DF",
      atlas: 2,
      tile: 5,
    },
    {
      id: "saliba",
      name: "William Saliba",
      country: "France",
      role: "DF",
      atlas: 2,
      tile: 6,
    },
    {
      id: "hakimi",
      name: "Achraf Hakimi",
      country: "Morocco",
      role: "DF",
      atlas: 2,
      tile: 7,
    },
    {
      id: "theo",
      name: "Theo Hernández",
      country: "France",
      role: "DF",
      atlas: 2,
      tile: 8,
    },
    {
      id: "cancelo",
      name: "João Cancelo",
      country: "Portugal",
      role: "DF",
      atlas: 2,
      tile: 9,
    },
    {
      id: "trent",
      name: "Trent Alexander-Arnold",
      country: "England",
      role: "DF",
      atlas: 2,
      tile: 10,
    },
    {
      id: "rudiger",
      name: "Antonio Rüdiger",
      country: "Germany",
      role: "DF",
      atlas: 2,
      tile: 11,
    },
    {
      id: "marquinhos",
      name: "Marquinhos",
      country: "Brazil",
      role: "DF",
      atlas: 2,
      tile: 12,
    },
    {
      id: "bastoni",
      name: "Alessandro Bastoni",
      country: "Italy",
      role: "DF",
      atlas: 2,
      tile: 13,
    },
    {
      id: "gvardiol",
      name: "Joško Gvardiol",
      country: "Croatia",
      role: "DF",
      atlas: 2,
      tile: 14,
    },
    {
      id: "cubarsi",
      name: "Pau Cubarsí",
      country: "Spain",
      role: "DF",
      atlas: 2,
      tile: 15,
    },
    {
      id: "bruno",
      name: "Bruno Fernandes",
      country: "Portugal",
      role: "MF",
      atlas: 3,
      tile: 0,
    },
    {
      id: "de-bruyne",
      name: "Kevin De Bruyne",
      country: "Belgium",
      role: "MF",
      atlas: 3,
      tile: 1,
    },
    {
      id: "modric",
      name: "Luka Modrić",
      country: "Croatia",
      role: "MF",
      atlas: 3,
      tile: 2,
    },
    {
      id: "valverde",
      name: "Federico Valverde",
      country: "Uruguay",
      role: "MF",
      atlas: 3,
      tile: 3,
    },
    {
      id: "musiala",
      name: "Jamal Musiala",
      country: "Germany",
      role: "MF",
      atlas: 3,
      tile: 4,
    },
    {
      id: "wirtz",
      name: "Florian Wirtz",
      country: "Germany",
      role: "MF",
      atlas: 3,
      tile: 5,
    },
    {
      id: "rice",
      name: "Declan Rice",
      country: "England",
      role: "MF",
      atlas: 3,
      tile: 6,
    },
    {
      id: "vitinha",
      name: "Vitinha",
      country: "Portugal",
      role: "MF",
      atlas: 3,
      tile: 7,
    },
    {
      id: "mac-allister",
      name: "Alexis Mac Allister",
      country: "Argentina",
      role: "MF",
      atlas: 3,
      tile: 8,
    },
    {
      id: "enzo",
      name: "Enzo Fernández",
      country: "Argentina",
      role: "MF",
      atlas: 3,
      tile: 9,
    },
    {
      id: "odegaard",
      name: "Martin Ødegaard",
      country: "Norway",
      role: "MF",
      atlas: 3,
      tile: 10,
    },
    {
      id: "lewandowski",
      name: "Robert Lewandowski",
      country: "Poland",
      role: "FW",
      atlas: 3,
      tile: 11,
    },
    {
      id: "lautaro",
      name: "Lautaro Martínez",
      country: "Argentina",
      role: "FW",
      atlas: 3,
      tile: 12,
    },
    {
      id: "alvarez",
      name: "Julián Álvarez",
      country: "Argentina",
      role: "FW",
      atlas: 3,
      tile: 13,
    },
    {
      id: "son",
      name: "Son Heung-min",
      country: "South Korea",
      role: "FW",
      atlas: 3,
      tile: 14,
    },
    {
      id: "nico",
      name: "Nico Williams",
      country: "Spain",
      role: "FW",
      atlas: 3,
      tile: 15,
    },
  ]
  const byId = Object.assign(
    Object.create(null),
    Object.fromEntries(players.map((p) => [p.id, p]))
  )
  const roles = {
    GK: "Goalkeeper",
    DF: "Defender",
    MF: "Midfielder",
    FW: "Forward",
  }
  const slots = [
    { id: "lw", role: "FW" },
    { id: "st", role: "FW" },
    { id: "rw", role: "FW" },
    { id: "lm", role: "MF" },
    { id: "cm", role: "MF" },
    { id: "rm", role: "MF" },
    { id: "lb", role: "DF" },
    { id: "lcb", role: "DF" },
    { id: "rcb", role: "DF" },
    { id: "rb", role: "DF" },
    { id: "gk", role: "GK" },
  ]
  const clone = (x) => structuredClone(x)
  const validDate = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s + "T12:00Z")) &&
    new Date(s + "T12:00Z").toISOString().slice(0, 10) === s
  function fresh() {
    return { teamName: "My Dream Team", rewards: [], rewardPercent: 0, challengeDays: [], lineup: {}, captain: null }
  }
  function normalize(raw) {
    if (raw === undefined) return fresh()
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      !Array.isArray(raw.rewards)
    )
      throw Error("Invalid football collection.")
    const out = fresh(),
      ids = new Set(),
      owned = new Set()
    out.teamName =
      typeof raw.teamName === "string" && raw.teamName.trim()
        ? raw.teamName.trim().slice(0, 40)
        : out.teamName
    for (const r of raw.rewards) {
      if (
        !r ||
        !validDate(r.earnedOn) ||
        !Array.isArray(r.options) ||
        !r.options.length ||
        r.options.length > 3 ||
        new Set(r.options).size !== r.options.length ||
        r.options.some((id) => !byId[id]) ||
        (r.id !== undefined &&
          (typeof r.id !== "string" || !r.id || ids.has(r.id)))
      )
        throw Error("Invalid player reward.")
      if (
        r.playerId !== null &&
        (!r.options.includes(r.playerId) || owned.has(r.playerId))
      )
        throw Error("Invalid collected player.")
      const id = r.id || "training:" + r.earnedOn
      if (ids.has(id)) throw Error("Invalid duplicate player reward.")
      ids.add(id)
      if (r.playerId) owned.add(r.playerId)
      out.rewards.push({
        id,
        earnedOn: r.earnedOn,
        missionDate: validDate(r.missionDate) ? r.missionDate : r.earnedOn,
        reason: typeof r.reason === "string" ? r.reason.slice(0, 80) : "daily-challenge",
        playerId: r.playerId,
        options: [...r.options],
      })
    }
    out.rewardPercent =
      Number.isInteger(raw.rewardPercent) && raw.rewardPercent >= 0 && raw.rewardPercent < 100
        ? raw.rewardPercent
        : 0
    out.challengeDays = Array.isArray(raw.challengeDays)
      ? [...new Set(raw.challengeDays.filter(validDate))].slice(-5000)
      : []
    const assigned = new Set()
    for (const slot of slots) {
      const id = raw.lineup?.[slot.id]
      if (
        id &&
        owned.has(id) &&
        (slot.role === "GK"
          ? byId[id].role === "GK"
          : byId[id].role !== "GK") &&
        !assigned.has(id)
      ) {
        out.lineup[slot.id] = id
        assigned.add(id)
      }
    }
    out.captain = owned.has(raw.captain) ? raw.captain : null
    return out
  }
  function ownedIds(data) {
    return data.rewards.map((r) => r.playerId).filter(Boolean)
  }
  function pending(data) {
    return data.rewards.find((r) => !r.playerId) || null
  }
  function shuffle(values, rng = Math.random) {
    const a = [...values]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  function offer(data, rng = Math.random) {
    const owned = new Set(ownedIds(data)),
      reserved = new Set(
        data.rewards.filter((r) => !r.playerId).flatMap((r) => r.options)
      ),
      available = players.filter((p) => !owned.has(p.id) && !reserved.has(p.id))
    if (!available.length) return []
    const previous = new Set(data.rewards.at(-1)?.options || []),
      fresh = available.filter((p) => !previous.has(p.id)),
      pool = fresh.length >= Math.min(3, available.length) ? fresh : available
    return shuffle(pool, rng)
      .slice(0, 3)
      .map((player) => player.id)
  }
  function earn(data, day, missionDate = day, rng = Math.random) {
    if (!validDate(day)) throw Error("Invalid training day.")
    if (data.rewards.some((r) => r.earnedOn === day)) return null
    const options = offer(data, rng)
    if (!options.length) return null
    const reward = {
      id: "training:" + day,
      earnedOn: day,
      missionDate: validDate(missionDate) ? missionDate : day,
      playerId: null,
      reason: "daily-challenge",
      options,
    }
    data.rewards.push(reward)
    return reward
  }
  function award(data, day, reason, awardId, rng = Math.random) {
    if (!validDate(day)) throw Error("Invalid reward day.")
    const options = offer(data, rng)
    if (!options.length) return null
    const id = `${reason}:${day}:${awardId || data.rewards.length + 1}`
    if (data.rewards.some((reward) => reward.id === id)) return null
    const reward = {
      id,
      earnedOn: day,
      missionDate: day,
      reason,
      playerId: null,
      options,
    }
    data.rewards.push(reward)
    return reward
  }
  function addProgress(data, amount, day, reason = "practice", rng = Math.random) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 99)
      throw Error("Invalid reward progress.")
    data.rewardPercent = (data.rewardPercent || 0) + amount
    while (data.rewardPercent >= 100) {
      if (!award(data, day, reason, data.rewards.length + 1, rng)) {
        data.rewardPercent = 99
        break
      }
      data.rewardPercent -= 100
    }
    return data.rewardPercent
  }
  function dailyChallenge(data, day) {
    if (!validDate(day)) throw Error("Invalid challenge day.")
    if (data.challengeDays.includes(day)) return false
    data.challengeDays.push(day)
    addProgress(data, 20, day, "daily-challenge")
    return true
  }
  function claim(data, rewardId, playerId) {
    const reward = data.rewards.find((r) => r.id === rewardId)
    if (
      !reward ||
      reward.playerId ||
      !reward.options.includes(playerId) ||
      ownedIds(data).includes(playerId)
    )
      throw Error("This player choice is no longer available.")
    reward.playerId = playerId
    const p = byId[playerId],
      empty = slots.find((s) => s.role === p.role && !data.lineup[s.id])
    if (empty) data.lineup[empty.id] = playerId
    if (!data.captain) data.captain = playerId
    return p
  }
  function assign(data, slotId, playerId) {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot || !ownedIds(data).includes(playerId) || !byId[playerId])
      throw Error("Choose a collected player for this position.")
    if (
      slot.role === "GK"
        ? byId[playerId].role !== "GK"
        : byId[playerId].role === "GK"
    )
      throw Error("Goalkeepers can only play in goal; choose a collected player.")
    for (const [key, id] of Object.entries(data.lineup))
      if (id === playerId) delete data.lineup[key]
    data.lineup[slotId] = playerId
  }
  function merge(current, incoming) {
    const out = normalize(current),
      other = normalize(incoming),
      owned = new Set(ownedIds(out))
    out.rewardPercent = Math.max(out.rewardPercent, other.rewardPercent)
    out.challengeDays = [...new Set([...out.challengeDays, ...other.challengeDays])].slice(-5000)
    for (const r of other.rewards) {
      const existing = out.rewards.find((x) => x.id === r.id)
      if (existing) {
        if (!existing.playerId && r.playerId && !owned.has(r.playerId)) {
          existing.playerId = r.playerId
          existing.options = [...r.options]
          owned.add(r.playerId)
        }
        continue
      }
      if (r.playerId && owned.has(r.playerId)) continue
      const options = r.options.filter((id) => !owned.has(id))
      if (!options.length) continue
      const next = { ...clone(r), options }
      if (next.playerId && !options.includes(next.playerId)) continue
      out.rewards.push(next)
      if (next.playerId) owned.add(next.playerId)
    }
    const reserved = new Set()
    out.rewards = out.rewards.filter((r) => {
      if (r.playerId) return true
      r.options = r.options.filter((id) => !owned.has(id) && !reserved.has(id))
      for (const p of players)
        if (
          r.options.length < 3 &&
          !owned.has(p.id) &&
          !reserved.has(p.id) &&
          !r.options.includes(p.id)
        )
          r.options.push(p.id)
      r.options.forEach((id) => reserved.add(id))
      return r.options.length > 0
    })
    return normalize(out)
  }
  return {
    players,
    byId,
    roles,
    slots,
    fresh,
    normalize,
    ownedIds,
    pending,
    offer,
    earn,
    award,
    addProgress,
    dailyChallenge,
    claim,
    assign,
    merge,
  }
})
