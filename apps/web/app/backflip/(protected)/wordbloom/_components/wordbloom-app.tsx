"use client"

import { useEffect, useRef } from "react"

import styles from "./wordbloom.module.css"

const SCRIPTS = [
  "seed.js",
  "football.js",
  "core.js",
  "storage.js",
  "portraits.js",
  "app.js",
]

declare global {
  interface Window {
    WORD_BLOOM_ASSET_BASE?: string
    WORD_BLOOM_MOUNT_MANAGED?: boolean
    WORD_BLOOM_LOAD?: Promise<void>
  }
}

function loadWordBloom() {
  window.WORD_BLOOM_ASSET_BASE = "/api/wordbloom/"
  window.WORD_BLOOM_MOUNT_MANAGED = true
  window.WORD_BLOOM_LOAD ??= SCRIPTS.reduce(
    (previous, file) =>
      previous.then(
        () =>
          new Promise<void>((resolve, reject) => {
            const script = document.createElement("script")
            script.src = window.WORD_BLOOM_ASSET_BASE + file
            script.async = false
            script.onload = () => resolve()
            script.onerror = () =>
              reject(new Error("WordBloom could not load " + file))
            document.body.append(script)
          })
      ),
    Promise.resolve()
  )
  return window.WORD_BLOOM_LOAD
}

/** Mounts the existing WordBloom learning engine inside the authenticated app. */
export function WordBloomApp() {
  const shell = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    loadWordBloom()
      .then(() => {
        if (active) window.dispatchEvent(new Event("wordbloom:mount"))
      })
      .catch((error: unknown) => {
        if (active && shell.current) {
          const message =
            error instanceof Error ? error.message : "WordBloom could not open."
          shell.current.innerHTML = `<p role="alert">${message}</p>`
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div
      ref={shell}
      className={`wordbloomRoot ${styles.shell}`}
      aria-label="WordBloom"
    >
      <header className="site-header">
        <button
          className="brand"
          data-action="home"
          aria-label="WordBloom home"
        >
          <span className="brand-icon" aria-hidden="true">
            ✳
          </span>
          <span>
            Word<span className="brand-light">Bloom</span>
            <small>FOOTBALL CLUB</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button data-action="test-home" data-nav="test">
            Tests
          </button>
          <button data-action="team" data-nav="team">
            My Team
          </button>
        </nav>
        <button className="parent-link" data-action="parent" data-nav="parent">
          Parent corner <span aria-hidden="true">↗</span>
        </button>
      </header>
      <div id="saveError" className="save-error" role="alert" hidden />
      <main id="app" aria-busy="true">
        <div className="loading">
          <span className="brand-icon">✳</span>
          <h1>Opening your club…</h1>
          <p>Your words are staying right here, on this device.</p>
        </div>
      </main>
      <footer>
        Every test counts. <span aria-hidden="true">⚽</span>
        <span id="storageLabel">Saved on this browser.</span>
        <button data-action="about">About &amp; moving devices</button>
        <a
          className="credits-link"
          href="/api/wordbloom/photo-credits.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Photo credits
        </a>
      </footer>
      <div
        id="toast"
        className="toast"
        role="status"
        aria-live="polite"
        hidden
      />
      <dialog id="modal" aria-labelledby="modalTitle">
        <div id="modalContent" />
      </dialog>
      <input
        id="backupFile"
        type="file"
        accept="application/json,.json"
        hidden
      />
      <noscript>
        WordBloom needs JavaScript enabled to practise and save your words.
      </noscript>
    </div>
  )
}
