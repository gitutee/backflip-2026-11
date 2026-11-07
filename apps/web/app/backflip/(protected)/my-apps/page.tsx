import type { Metadata } from "next"
import { RiArrowRightUpLine } from "@remixicon/react"
import { Card } from "@workspace/ui/components/card"

import { requireCapability } from "@/app/_lib/auth/guard"
import { titleFor } from "../../_lib/crumbs"
import { PageHeading } from "../_components/page-heading"

export const metadata: Metadata = { title: titleFor("/backflip/my-apps") }

/**
 * Authenticated application library with square illustrated launch cards.
 * @spec L2-UI-67
 */
export default async function MyAppsPage() {
  await requireCapability("dashboard")
  const wordBloomHref =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3081/wordbloom"
      : "/backflip/wordbloom"

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-10 p-6 lg:p-8">
        <PageHeading
          title="My apps"
          description="A little space for everything you use. Pick an app and jump in."
        />

        <section aria-label="Your applications">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-sm font-medium">All apps</h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              1
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="group relative aspect-square overflow-hidden rounded-2xl p-0 shadow-none transition-[box-shadow,transform] hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
              <a
                href={wordBloomHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open WordBloom (opens in a new tab)"
                className="flex h-full flex-col outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/60">
                  <span className="absolute top-4 left-4 text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Words in bloom
                  </span>
                  <svg
                    viewBox="0 0 240 180"
                    aria-hidden="true"
                    className="h-full max-h-52 w-full text-foreground transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                    fill="none"
                  >
                    <circle
                      cx="120"
                      cy="95"
                      r="64"
                      className="fill-background"
                    />
                    <path
                      d="M120 142V92"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M120 127C99 127 92 115 92 108C111 108 120 116 120 127Z"
                      className="fill-muted-foreground/25"
                    />
                    <path
                      d="M120 139C141 139 151 125 151 118C130 118 120 128 120 139Z"
                      className="fill-muted-foreground/40"
                    />
                    <g className="fill-foreground">
                      <ellipse cx="120" cy="62" rx="12" ry="23" />
                      <ellipse
                        cx="120"
                        cy="62"
                        rx="12"
                        ry="23"
                        transform="rotate(60 120 84)"
                      />
                      <ellipse
                        cx="120"
                        cy="62"
                        rx="12"
                        ry="23"
                        transform="rotate(120 120 84)"
                      />
                      <ellipse
                        cx="120"
                        cy="62"
                        rx="12"
                        ry="23"
                        transform="rotate(180 120 84)"
                      />
                      <ellipse
                        cx="120"
                        cy="62"
                        rx="12"
                        ry="23"
                        transform="rotate(240 120 84)"
                      />
                      <ellipse
                        cx="120"
                        cy="62"
                        rx="12"
                        ry="23"
                        transform="rotate(300 120 84)"
                      />
                    </g>
                    <circle
                      cx="120"
                      cy="84"
                      r="12"
                      className="fill-background"
                    />
                    <path
                      d="m115 80 2 8 3-6 3 6 2-8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m66 67 3-5 3 5-3 5-3-5ZM170 110l3-5 3 5-3 5-3-5Z"
                      className="fill-muted-foreground/50"
                    />
                  </svg>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-card p-5">
                  <div>
                    <h3 className="font-semibold tracking-tight">WordBloom</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Open your WordBloom workspace.
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors group-hover:bg-foreground group-hover:text-background">
                    <RiArrowRightUpLine className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </a>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
