import { Head, Link } from '@inertiajs/react'
import {
  Activity,
  Globe,
  Hash,
  Link as LinkIcon,
  Mail,
  Server,
  Shield,
  Gauge,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const tools = [
  { title: 'IP Intelligence', href: '/tools/ip', icon: Globe, description: 'GeoIP, ASN, abuse, reverse DNS' },
  { title: 'Domain Intelligence', href: '/tools/domain', icon: Server, description: 'WHOIS, DNS, reputation' },
  { title: 'Hash Analysis', href: '/tools/hash', icon: Hash, description: 'File hash & malware detection' },
  { title: 'SSL Inspector', href: '/tools/ssl', icon: Shield, description: 'Certificate validity & chain' },
  { title: 'Email Reputation', href: '/tools/email', icon: Mail, description: 'Deliverability & risk' },
  { title: 'Latency Monitor', href: '/tools/latency', icon: Gauge, description: 'RTT to host' },
  { title: 'URL Tracer', href: '/tools/url-tracer', icon: LinkIcon, description: 'Unshorten & redirect chain' },
  { title: 'OSINT Monitor', href: '/tools/monitor', icon: Activity, description: 'Team-wide recent lookups' },
]

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Head title='Dashboard' />
      <div className='space-y-6'>
        <PageHeader
          title='OSINT & Threat Analysis'
          description='Run checks and see who else has looked up the same targets.'
        />

        <div>
          <h2 className='text-lg font-semibold mb-3'>Tools</h2>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link key={tool.href} href={tool.href}>
                  <Card className='hover:bg-muted/50 transition-colors cursor-pointer h-full'>
                    <CardHeader className='flex flex-row items-center gap-2 space-y-0 pb-2'>
                      <Icon className='h-4 w-4 text-primary' />
                      <CardTitle className='text-sm font-medium'>{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className='text-xs text-muted-foreground'>{tool.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
