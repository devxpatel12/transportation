"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { MapPin, Pause, Play, Radio } from "lucide-react"
import { useStore } from "@/lib/store"
import { DEMO_TRACKING_HOUR, DISPATCH_HOUR, SHIPPING_POINTS, fmtHour } from "@/lib/data"
import { buildLive, VEHICLE_PHOTO, type LivePhase } from "@/lib/tracking"
import { VehiclePhoto } from "@/components/app/vehicle-photo"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FleetMap = dynamic(() => import("@/components/app/fleet-map"), { ssr: false, loading: () => <div className="size-full animate-pulse bg-zinc-900" /> })

const PHASE_STYLE: Record<LivePhase, string> = {
  Scheduled: "bg-slate-500/20 text-slate-300",
  Loading: "bg-sky-500/20 text-sky-300",
  "In transit": "bg-orange-500/20 text-orange-300",
  Unloading: "bg-violet-500/20 text-violet-300",
  Returning: "bg-yellow-500/20 text-yellow-300",
  Completed: "bg-emerald-500/20 text-emerald-300",
}
const ON_ROAD: LivePhase[] = ["Loading", "In transit", "Unloading", "Returning"]
const MAX = 22

export function LiveTracking() {
  const { plan, ctx, optimize } = useStore()
  const [now, setNow] = useState(DEMO_TRACKING_HOUR)
  const [playing, setPlaying] = useState(true)
  const [sel, setSel] = useState<string | undefined>()

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setNow((n) => (n >= MAX ? DISPATCH_HOUR : Math.min(MAX, n + 0.05))), 250)
    return () => clearInterval(id)
  }, [playing])

  const live = useMemo(() => (plan?.trips ?? []).map((t) => buildLive(t, ctx, SHIPPING_POINTS.find((s) => s.id === t.sp)!, now)), [plan, ctx, now])
  if (!plan)
    return (
      <Card className="mt-6 items-center gap-3 bg-gradient-to-br from-orange-600/20 via-zinc-950 to-zinc-950 py-12 text-center text-zinc-100 ring-zinc-800">
        <Radio className="size-6 text-orange-400" />
        <div className="text-base font-semibold">Simulated fleet tracking</div>
        <p className="max-w-sm text-sm text-zinc-400">Run the optimizer to put the planned trips on the map and follow each vehicle from depot to drop.</p>
        <Button onClick={() => optimize()}><Play /> Run optimization</Button>
      </Card>
    )
  const active = live.filter((l) => ON_ROAD.includes(l.phase))
  const counts = (["In transit", "Unloading", "Loading", "Returning", "Completed", "Scheduled"] as LivePhase[]).map((p) => [p, live.filter((l) => l.phase === p).length] as const)
  const ordered = [...live].sort((a, b) => Number(ON_ROAD.includes(b.phase)) - Number(ON_ROAD.includes(a.phase)))

  return (
    <Card className="mt-6 overflow-hidden bg-zinc-950 p-0 text-zinc-100 ring-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-orange-600/25 via-zinc-950 to-zinc-950 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-orange-500" /></span>
          <div><div className="text-base font-semibold">Simulated fleet tracking</div><div className="text-xs text-zinc-400">Simulated from the draft plan · {active.length} of {live.length} trips on the road</div></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">{counts.filter(([, n]) => n > 0).map(([p, n]) => <span key={p} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PHASE_STYLE[p])}>{n} {p}</span>)}</div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1">
            <Button size="icon-xs" variant="ghost" className="text-orange-400 hover:bg-zinc-800 hover:text-orange-300" onClick={() => setPlaying((p) => !p)}>{playing ? <Pause /> : <Play />}</Button>
            <input type="range" min={DISPATCH_HOUR} max={MAX} step={0.05} value={now} onChange={(e) => { setPlaying(false); setNow(+e.target.value) }} className="w-32 accent-orange-500" aria-label="Simulation time" />
            <span className="w-14 text-right font-mono text-xs tabular-nums text-orange-300">{fmtHour(now)}</span>
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1fr_380px]">
        <div className="relative h-[460px] lg:h-[560px]">
          <FleetMap trips={live} selectedId={sel} onSelect={setSel} />
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur"><Radio className="size-3 text-orange-400" /> Dashed = planned route · circle = live position</div>
          {sel && <Button size="xs" variant="secondary" className="absolute right-3 top-3 z-[500]" onClick={() => setSel(undefined)}>Show all</Button>}
        </div>
        <div className="max-h-[560px] space-y-2 overflow-y-auto border-t border-zinc-800 p-3 lg:border-l lg:border-t-0">
          {ordered.map((l) => {
            const v = ctx.vehicles[l.trip.vehicleId]
            const isSel = sel === l.trip.id
            return (
              <button key={l.trip.id} onClick={() => setSel(isSel ? undefined : l.trip.id)} className={cn("w-full rounded-xl border bg-zinc-900/80 p-2.5 text-left transition hover:border-orange-500/60", isSel ? "border-orange-500 ring-1 ring-orange-500/50" : "border-zinc-800")}>
                <div className="flex gap-3">
                  <VehiclePhoto type={v.type} className="w-20" sizes="96px" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">#{l.trip.id.replace("T-", "")}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", PHASE_STYLE[l.phase])}>{l.phase}</span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-zinc-400">{v.reg} · {VEHICLE_PHOTO[v.type].model} · {v.ownership}</div>
                    <div className="mt-1 flex items-center gap-1 truncate text-xs text-zinc-300"><MapPin className="size-3 shrink-0 text-orange-400" />{l.nextStop ? `${l.nextStop.name} · ETA ${fmtHour(l.nextStop.eta)}` : l.phase === "Completed" ? "Back at depot" : "Awaiting dispatch"}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{l.trip.sp}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all" style={{ width: `${Math.round(l.progress * 100)}%` }} /></div>
                  <span className="w-8 text-right text-[10px] tabular-nums text-zinc-400">{Math.round(l.progress * 100)}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
