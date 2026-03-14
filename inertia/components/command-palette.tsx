'use client'

import type { SharedProps } from '@adonisjs/inertia/types'
import { router, usePage } from '@inertiajs/react'
import {
  Activity,
  Check,
  Gauge,
  Globe,
  Hash,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Mail,
  Moon,
  Server,
  Settings,
  Shield,
  Sun,
} from 'lucide-react'
import * as React from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useTheme } from '@/hooks/use-theme'

type CommandEntry = {
  label: string
  href: string
  icon?: React.ReactNode
  keywords?: string
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return target.isContentEditable
}

export function CommandPalette() {
  const page = usePage<SharedProps>()
  const isLoggedIn = Boolean(page.props.isLoggedIn)
  const { theme, setTheme } = useTheme()

  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isCmdK = (e.metaKey || e.ctrlKey) && key === 'k'
      if (!isCmdK) return

      if (isEditableTarget(e.target)) return

      e.preventDefault()
      setOpen((v) => !v)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = React.useCallback((href: string) => {
    setOpen(false)
    router.visit(href)
  }, [])

  const selectTheme = React.useCallback(
    (next: 'light' | 'dark' | 'system') => {
      setOpen(false)
      setTheme(next)
    },
    [setTheme],
  )

  if (!isLoggedIn) return null

  const mainNav: CommandEntry[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className='mr-2 h-4 w-4' /> },
    { label: 'Settings', href: '/settings', icon: <Settings className='mr-2 h-4 w-4' /> },
  ]

  const toolsNav: CommandEntry[] = [
    { label: 'IP Intelligence', href: '/tools/ip', icon: <Globe className='mr-2 h-4 w-4' /> },
    { label: 'Domain Intelligence', href: '/tools/domain', icon: <Server className='mr-2 h-4 w-4' /> },
    { label: 'Hash Analysis', href: '/tools/hash', icon: <Hash className='mr-2 h-4 w-4' /> },
    { label: 'SSL Inspector', href: '/tools/ssl', icon: <Shield className='mr-2 h-4 w-4' /> },
    { label: 'Email Reputation', href: '/tools/email', icon: <Mail className='mr-2 h-4 w-4' /> },
    { label: 'Latency Monitor', href: '/tools/latency', icon: <Gauge className='mr-2 h-4 w-4' /> },
    { label: 'URL Tracer', href: '/tools/url-tracer', icon: <LinkIcon className='mr-2 h-4 w-4' /> },
    { label: 'OSINT Monitor', href: '/tools/monitor', icon: <Activity className='mr-2 h-4 w-4' /> },
  ]

  const accountActions: CommandEntry[] = [
    { label: 'Log out', href: '/logout', icon: <LogOut className='mr-2 h-4 w-4' /> },
  ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search…' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading='App'>
          {mainNav.map((item) => (
            <CommandItem
              key={item.href}
              className='cursor-pointer py-2'
              value={`${item.label} ${item.keywords || ''}`}
              onSelect={() => go(item.href)}>
              {item.icon}
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Tools'>
          {toolsNav.map((item) => (
            <CommandItem
              key={item.href}
              className='cursor-pointer py-2'
              value={`${item.label} ${item.keywords || ''}`}
              onSelect={() => go(item.href)}>
              {item.icon}
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Theme'>
          <CommandItem value='Theme: Light' onSelect={() => selectTheme('light')}>
            <Sun className='mr-2 h-4 w-4' />
            Light
            {theme === 'light' ? <Check className='ml-auto h-4 w-4' /> : null}
          </CommandItem>
          <CommandItem value='Theme: Dark' onSelect={() => selectTheme('dark')}>
            <Moon className='mr-2 h-4 w-4' />
            Dark
            {theme === 'dark' ? <Check className='ml-auto h-4 w-4' /> : null}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Account'>
          {accountActions.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.keywords || ''}`}
              onSelect={() => go(item.href)}>
              {item.icon}
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
