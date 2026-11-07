/** @spec L2-UI-72 */
export function isLocalWordBloomHost(host: string | null) {
  if (process.env.NODE_ENV !== "development" || !host) return false

  try {
    const url = new URL(`http://${host}`)
    return (
      url.port === "3081" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  } catch {
    return false
  }
}
