import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { isLocalWordBloomHost } from "@/app/_lib/wordbloom-local"
import { WordBloomApp } from "../backflip/(protected)/wordbloom/_components/wordbloom-app"

export const metadata: Metadata = {
  title: "WordBloom",
  description: "A private, local WordBloom learning app.",
}

export const dynamic = "force-dynamic"

/** Local-only standalone presentation; the protected Backflip route remains available. */
export default async function LocalWordBloomPage() {
  if (!isLocalWordBloomHost((await headers()).get("host"))) notFound()
  return <WordBloomApp />
}
