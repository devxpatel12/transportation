import Image from "next/image"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ShieldCheck, Radar, Truck, Info } from "lucide-react"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <svg className="absolute size-0" aria-hidden="true">
        <defs>
          <filter id="routewys-dark-logo" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 1.45 0 0  0 1 1.42 0 0  0 0 2.18 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>

      {/* Full-bleed background video (poster image for slow loads / reduced motion) */}
      <Image src="/vehicles/mcv.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      <video
        className="absolute inset-0 size-full object-cover motion-reduce:hidden"
        src="/videos/login-bg.mp4"
        poster="/vehicles/mcv.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-zinc-950/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-zinc-950/30" />

      <ThemeToggle className="absolute right-4 top-4 z-10 w-28 border-white/10 bg-black/40 backdrop-blur" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.2fr_minmax(0,28rem)] lg:px-16">
        <div className="hidden h-full flex-col justify-between py-4 lg:flex">
          <Image src="/routewys-logo.webp" alt="RouteWyse" width={640} height={163} unoptimized className="h-auto w-52 [filter:url(#routewys-dark-logo)]" />
          <div>
            <h2 className="max-w-xl text-5xl font-semibold leading-[1.1] tracking-tight">
              Plan tomorrow&apos;s dispatch in <span className="text-orange-500">minutes,</span> not hours.
            </h2>
            <p className="mt-5 max-w-md text-base text-white/80">SAP-integrated route optimization for company-owned and partner fleets across five states.</p>
            <div className="mt-6 h-0.5 w-10 bg-orange-500" />
            <div className="mt-6 grid max-w-md gap-5 text-sm">
              {[[Truck, "Right vehicle for every load, with capacity and permit checks"], [Radar, "Live fleet tracking from depot to drop"], [ShieldCheck, "Approval workflow and a full audit trail"]].map(([I, t], i) => {
                const Icon = I as typeof Truck
                return <div key={i} className="flex items-center gap-4"><Icon className="size-6 shrink-0 text-orange-500" /><span className="border-l border-white/20 pl-4">{t as string}</span></div>
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 font-semibold uppercase tracking-wide text-zinc-950">Demo environment <Info className="size-3.5" /></span>
            Sample data · Not for live dispatch operations
          </div>
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 p-8 shadow-2xl backdrop-blur-xl lg:justify-self-end">
          <Image src="/routewys-logo.webp" alt="RouteWyse" width={640} height={163} unoptimized className="mb-8 h-auto w-44 [filter:url(#routewys-dark-logo)] lg:hidden" />
          {children}
        </div>
      </div>
    </div>
  )
}
