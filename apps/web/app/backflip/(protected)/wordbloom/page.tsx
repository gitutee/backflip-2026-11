import type { Metadata } from "next"

import { requireCapability } from "@/app/_lib/auth/guard"
import { WordBloomApp } from "./_components/wordbloom-app"

export const metadata: Metadata = {
  title: "WordBloom",
}

/** Authenticated WordBloom learning app. @spec L2-UI-71 */
export default async function WordBloomPage() {
  await requireCapability("dashboard")
  return <WordBloomApp />
}
