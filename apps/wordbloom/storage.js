/* IndexedDB transactions keep pictures and state changes together. */
window.BloomStore = (() => {
  let db,
    revision = 0
  async function open() {
    db = await new Promise((resolve, reject) => {
      if (!window.indexedDB)
        return reject(
          Error(
            "This browser cannot save data. Open WordBloom in a regular browser window."
          )
        )
      const request = indexedDB.open("wordbloom-v3", 1)
      const timer = setTimeout(
        () =>
          reject(
            Error(
              "Storage is blocked. Close other WordBloom windows and try again."
            )
          ),
        8000
      )
      request.onupgradeneeded = () => {
        request.result.createObjectStore("state", { keyPath: "id" })
        request.result.createObjectStore("assets", { keyPath: "id" })
      }
      request.onsuccess = () => {
        clearTimeout(timer)
        resolve(request.result)
      }
      request.onerror = () => {
        clearTimeout(timer)
        reject(request.error)
      }
      request.onblocked = () => {
        clearTimeout(timer)
        reject(
          Error("Close other WordBloom windows to finish opening storage.")
        )
      }
    })
    db.onversionchange = () => db.close()
    const record = await read("state", "current")
    revision = record?.revision || 0
    return record?.data || null
  }
  function read(store, id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store),
        r = tx.objectStore(store).get(id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  }
  function assets() {
    return new Promise((resolve, reject) => {
      const r = db.transaction("assets").objectStore("assets").getAll()
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  }
  function commit(data, pictures = [], replace = false) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["state", "assets"], "readwrite")
      let cause, nextRevision
      tx.oncomplete = () => {
        revision = nextRevision
        resolve()
      }
      tx.onerror = () => {
        cause = cause || tx.error
      }
      tx.onabort = () =>
        reject(cause || tx.error || Error("Nothing was saved. Try again."))
      const request = tx.objectStore("state").get("current")
      request.onsuccess = () => {
        if ((request.result?.revision || 0) !== revision) {
          cause = Error(
            "Another WordBloom window saved changes. Reload this window before continuing."
          )
          tx.abort()
          return
        }
        nextRevision = revision + 1
        const library = tx.objectStore("assets")
        if (replace) library.clear()
        pictures.forEach((p) => library.put(p))
        tx.objectStore("state").put({
          id: "current",
          revision: nextRevision,
          data,
        })
      }
    })
  }
  async function rawBackup() {
    return {
      format: "wordbloom-recovery",
      state: await read("state", "current"),
      assets: await assets(),
    }
  }
  return { open, assets, commit, rawBackup }
})()
