import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Globe,
  Hash,
  LayoutDashboard,
  Link as LinkIcon,
  Mail,
  Server,
  Shield,
  Gauge,
} from 'lucide-react'
import { PublicLayout } from '@/components/layouts/public'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home(props: SharedProps) {
  const isLoggedIn = Boolean(props.isLoggedIn)

  return (
    <PublicLayout>
      <Head title='Open Threat Data'>
        <meta name='description' content='Open source intelligence and threat analysis platform: IP and domain intelligence, hash analysis, SSL inspection, email reputation, latency checks, URL tracing, and team-wide activity monitor.' />
      </Head>

      <section className='relative overflow-hidden'>
        <div className='absolute inset-0 -z-10 bg-gradient-to-b from-primary/15 via-background to-background' />
        <div className='pointer-events-none absolute -top-24 left-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl' />

        <div className='max-w-screen-xl mx-auto px-6 py-14 sm:py-20'>
          <div className='grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'>
            <div className='space-y-6'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='secondary'>OSINT & Threat Analysis</Badge>
              </div>

              <h1 className='text-4xl font-bold tracking-tight sm:text-5xl'>
                Open Source Intelligence & Threat Analysis Platform
              </h1>
              <p className='text-muted-foreground text-base sm:text-lg max-w-2xl'>
                A simple assistant tool for teams: IP and domain intelligence, hash analysis, SSL
                inspection, email reputation, latency checks, URL tracing, and a shared activity
                monitor. See who checked what.
              </p>

              <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                {isLoggedIn ? (
                  <Button size='lg' rightIcon={<ArrowRight className='h-4 w-4' />} asChild>
                    <Link href='/dashboard'>Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button size='lg' rightIcon={<ArrowRight className='h-4 w-4' />} asChild>
                      <Link href='/login'>Sign in</Link>
                    </Button>
                    <Button size='lg' variant='outline' asChild>
                      <Link href='/signup'>Create an account</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className='relative'>
              <Card className='overflow-hidden'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base'>Tools</CardTitle>
                  <CardDescription>Run lookups and see who else checked the same target.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <ChecklistItem>IP Intelligence — GeoIP, ASN, abuse, reverse DNS</ChecklistItem>
                  <ChecklistItem>Domain Intelligence — WHOIS, DNS, reputation</ChecklistItem>
                  <ChecklistItem>Hash Analysis — File hash & malware detection</ChecklistItem>
                  <ChecklistItem>SSL Certificate Inspector</ChecklistItem>
                  <ChecklistItem>Email Reputation</ChecklistItem>
                  <ChecklistItem>Latency Monitor</ChecklistItem>
                  <ChecklistItem>Deep Link Tracer — Unshorten & redirect chain</ChecklistItem>
                  <ChecklistItem>Global OSINT Monitor — Team-wide recent lookups</ChecklistItem>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className='max-w-screen-xl mx-auto px-6 pb-16'>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          <FeatureCard
            icon={<Globe className='h-4 w-4' />}
            title='IP Intelligence'
            description='GeoIP, ASN, abuse reports, reverse DNS.'
          />
          <FeatureCard
            icon={<Server className='h-4 w-4' />}
            title='Domain Intelligence'
            description='WHOIS, DNS records, domain reputation.'
          />
          <FeatureCard
            icon={<Hash className='h-4 w-4' />}
            title='Hash Analysis'
            description='File hash reputation, malware detection.'
          />
          <FeatureCard
            icon={<Shield className='h-4 w-4' />}
            title='SSL Inspector'
            description='Certificate validity, issuer, SANs, chain.'
          />
          <FeatureCard
            icon={<Mail className='h-4 w-4' />}
            title='Email Reputation'
            description='Deliverability and risk assessment.'
          />
          <FeatureCard
            icon={<Gauge className='h-4 w-4' />}
            title='Latency Monitor'
            description='RTT to host or URL.'
          />
          <FeatureCard
            icon={<LinkIcon className='h-4 w-4' />}
            title='URL Tracer'
            description='Unshorten URLs, analyze redirect chains.'
          />
          <FeatureCard
            icon={<Activity className='h-4 w-4' />}
            title='OSINT Monitor'
            description='Team-wide recent lookups.'
          />
        </div>

        <div className='mt-10'>
          <Card className='overflow-hidden'>
            <CardContent className='p-8 sm:p-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
              <div className='space-y-2'>
                <div className='text-2xl font-bold tracking-tight'>Ready to run checks?</div>
                <div className='text-muted-foreground'>
                  Sign in to use the tools and see who else has looked up the same targets.
                </div>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row'>
                {isLoggedIn ? (
                  <Button size='lg' asChild rightIcon={<ArrowRight className='h-4 w-4' />}>
                    <Link href='/dashboard'>Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button size='lg' asChild rightIcon={<ArrowRight className='h-4 w-4' />}>
                      <Link href='/login'>Sign in</Link>
                    </Button>
                    <Button size='lg' variant='outline' asChild>
                      <Link href='/signup'>Create an account</Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  )
}

function ChecklistItem({ children }: { children: string }) {
  return (
    <div className='flex items-start gap-2 text-sm'>
      <CheckCircle2 className='h-4 w-4 text-primary mt-0.5 shrink-0' />
      <span className='text-muted-foreground'>{children}</span>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className='h-full'>
      <CardHeader className='space-y-2'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <span className='text-primary'>{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
