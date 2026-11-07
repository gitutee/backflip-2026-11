"use client"

import { useState, type ComponentProps, type ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"
import {
  RiLayoutGridLine,
  RiArrowRightSLine,
  RiDashboardLine,
  RiLinksLine,
  RiPlugLine,
} from "@remixicon/react"

import { BrandIcon } from "@/app/_components/brand-icon"
import { can, type Capability } from "@/app/_lib/auth/permissions"
import { NavUser } from "./nav-user"
import type { SessionUser } from "./types"

const WORDBLOOM_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3081/wordbloom"
    : "/backflip/wordbloom"

type NavItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  capability: Capability
  newTab?: boolean
  children?: { title: string; url: string; newTab?: boolean }[]
}

/** Nav grouped into design's labeled sections; each item declares its
 *  capability. The Settings group is pinned to the bottom (above the user).
 *  @spec L2-UI-66
 */
const NAV_GROUPS: { label: string; pinBottom?: boolean; items: NavItem[] }[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Overview",
        url: "/backflip",
        icon: RiDashboardLine,
        capability: "dashboard",
      },
      {
        title: "My apps",
        url: "/backflip/my-apps",
        icon: RiLayoutGridLine,
        capability: "dashboard",
        children: [
          {
            title: "WordBloom",
            url: WORDBLOOM_URL,
            newTab: true,
          },
        ],
      },
    ],
  },
  {
    label: "Settings",
    pinBottom: true,
    items: [
      {
        title: "Integrations",
        url: "/backflip/settings/integrations",
        icon: RiLinksLine,
        capability: "settings",
      },
      {
        title: "MCP capabilities",
        url: "/backflip/settings/mcp-capabilities",
        icon: RiPlugLine,
        capability: "settings",
      },
    ],
  },
]

function isActive(pathname: string, url: string) {
  return url === "/backflip" ? pathname === url : pathname.startsWith(url)
}

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(user.role, i.capability)),
  })).filter((g) => g.items.length > 0)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/backflip" />}
              className="gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
            >
              {/* Same brand tile as the public wordmark (bordered card tile +
                  arc glyph), not an icon-on-primary block. */}
              <div className="flex aspect-square size-7 flex-none items-center justify-center rounded-md border bg-card">
                <BrandIcon size={14} className="text-primary" />
              </div>
              {/* Collapsed rail = icon only: the label block leaves the flow
                  entirely, otherwise `flex-1` keeps its intrinsic width and
                  shoves the tile out of the 32px button (overflow-hidden). */}
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold">Backflip</span>
                <span className="text-xs text-muted-foreground">
                  Admin console
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            className={group.pinBottom ? "mt-auto" : undefined}
          >
            <SidebarGroupLabel className="text-[11px] tracking-wide uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.children ? (
                    <Collapsible
                      key={item.title}
                      open={
                        openMenus[item.title] ?? isActive(pathname, item.url)
                      }
                      onOpenChange={(open) =>
                        setOpenMenus((current) => ({
                          ...current,
                          [item.title]: open,
                        }))
                      }
                      render={<SidebarMenuItem />}
                    >
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive(pathname, item.url)}
                        render={<Link href={item.url} />}
                        onClick={() =>
                          setOpenMenus((current) => ({
                            ...current,
                            [item.title]: true,
                          }))
                        }
                        className="gap-2.5 text-[13px] data-active:font-semibold"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <CollapsibleTrigger
                        render={<SidebarMenuAction />}
                        className="group/apps"
                        aria-label="Toggle My apps submenu"
                      >
                        <RiArrowRightSLine className="transition-transform group-aria-expanded/apps:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton
                                render={<Link href={child.url} />}
                                target={child.newTab ? "_blank" : undefined}
                                rel={
                                  child.newTab
                                    ? "noopener noreferrer"
                                    : undefined
                                }
                              >
                                <span>{child.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive(pathname, item.url)}
                        render={
                          <Link
                            href={item.url}
                            target={item.newTab ? "_blank" : undefined}
                            rel={
                              item.newTab ? "noopener noreferrer" : undefined
                            }
                          />
                        }
                        className="gap-2.5 text-[13px] data-active:font-semibold"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
