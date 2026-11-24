"use client"

import { useState } from "react"
import Image from "next/image"
import { DispatchMap } from "@/components/app/dispatch-map"
import Link from "next/link"
import { toast } from "sonner"
import { Gauge, MapPin, ShieldCheck, Wrench } from "lucide-react"
import { useStore } from "@/lib/store"
import { ALL_STATES, DEMO_TRACKING_HOUR, SHIPPING_POINTS, VEHICLE_TYPES, fmtHour, inr, type Vehicle } from "@/lib/data"
import { buildLive, VEHICLE_PHOTO } from "@/lib/tracking"
import { Tag, UtilBar } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const Spec = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div className="rounded-lg border bg-muted/30 px-3 py-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-0.5 text-sm font-semibold tabular-nums">{v}</div></div>
)

export function VehicleDialog({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const { plan, ctx, vehicles, setVehicleStatus } = useStore()
  const [selection, setSelection] = useState<{ origin: string; id: string } | null>(null)
  const v = vehicle && (selection?.origin === vehicle.id ? vehicles.find(x => x.id === selection.id) ?? vehicle : vehicle)
  const close = () => { setSelection(null); onClose() }
  const t = v ? VEHICLE_TYPES[v.type] : null
  const trip = v ? plan?.trips.find((x) => x.vehicleId === v.id) : undefined
  const sp = v ? SHIPPING_POINTS.find((s) => s.id === v.location) : undefined
  const demoLocation = trip && sp && trip.stops.length ? buildLive(trip, ctx, sp, DEMO_TRACKING_HOUR) : undefined
  const stops = trip?.stops ?? []
  const routeCustomers = stops.map(s => ctx.customers[ctx.deliveries[s.deliveryId].customerId])
  const tone = v?.status === "Available" ? "green" : v?.status === "Assigned" ? "amber" : "red"
  return (
    <Dialog open={!!v} onOpenChange={(o) => !o && close()}>
      <DialogContent className="!block !max-w-none !gap-0 !bg-background !p-0" style={{ width: "min(1440px, calc(100vw - 32px))", maxHeight: "calc(100dvh - 32px)", top: "16px", left: "50%", translate: "-50% 0", minWidth: 0, overflowX: "hidden", overflowY: "auto", display: "block", backgroundColor: "var(--background)" }} overlayClassName="bg-black/35 supports-backdrop-filter:backdrop-blur-none">
        {v && t && (
          <>
            <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-4 pr-14">
              <div><div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Vehicle workspace</div><DialogTitle className="text-2xl font-semibold">{v.reg}</DialogTitle><DialogDescription className="mt-1">{VEHICLE_PHOTO[v.type].model} · {v.type} · {v.id}</DialogDescription></div>
              <div className="flex flex-wrap gap-2"><Tag tone="gray">Prototype data</Tag><Tag tone={v.ownership === "Company" ? "blue" : "amber"}>{v.ownership}</Tag><Tag tone={tone}>{v.status}</Tag></div>
            </header>
            <div className="grid w-full min-w-0 gap-4 bg-muted/30 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3">
                <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">Current plan assignment</div><div className="mt-2 text-lg font-semibold">{trip?.id ?? "Unallocated"}</div><div className="mt-2 text-xs text-muted-foreground">{trip ? `${Math.round(trip.distanceKm)} km · ${trip.stops.length} stops` : "No feasible allocation in this plan"}</div><div className="mt-4 border-t pt-3 text-sm"><div className="text-xs text-muted-foreground">Depot</div>{sp?.name ?? v.location}<div className="mt-2 text-xs text-muted-foreground">Ready from {fmtHour(v.availableFromH)}</div></div></div>
                <Spec l="Planned departure" v={trip ? fmtHour(trip.startH) : "—"} />
                <Spec l="Final planned stop" v={routeCustomers[routeCustomers.length - 1]?.city ?? "—"} />
                <Spec l="Demo location" v={demoLocation ? <>{demoLocation.pos.lat.toFixed(4)}, {demoLocation.pos.lng.toFixed(4)}<div className="text-[11px] font-normal text-muted-foreground">{demoLocation.phase} · {fmtHour(DEMO_TRACKING_HOUR)}</div></> : sp ? <>{sp.name}<div className="text-[11px] font-normal text-muted-foreground">Home depot · not GPS</div></> : "Unknown"} />
              </div>
              <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card" style={{ minHeight: 288, height: "100%" }}><Image src={VEHICLE_PHOTO[v.type].src} alt={`${VEHICLE_PHOTO[v.type].model} representative vehicle`} fill sizes="(min-width:1024px) 700px, 90vw" className="object-contain" /><span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">Representative vehicle image</span></div>
              <div className="space-y-3">
                <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">Planned payload / usable capacity</div><div className="mt-2 text-2xl font-semibold tabular-nums">{trip ? (trip.weightKg / 1000).toFixed(2) : "0"} <span className="text-sm font-normal text-muted-foreground">/ {t.usableKg / 1000} T</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500" style={{width: `${Math.min(100, (trip?.weightKg ?? 0) / t.usableKg * 100)}%`}} /></div></div>
                <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">Planned volume</div><div className="mt-1 text-xl font-semibold">{(trip?.volumeM3 ?? 0).toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ {t.volM3} m³</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{width: `${Math.min(100, (trip?.volumeM3 ?? 0) / t.volM3 * 100)}%`}} /></div></div>
                <Spec l="Estimated trip cost" v={trip ? inr(trip.cost) : "—"} />
              </div>
            </div>
            <section className="w-full min-w-0 overflow-hidden border-y bg-background px-5 py-3" aria-label="Select another vehicle">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-medium text-muted-foreground">Browse fleet</h3><span className="text-xs text-muted-foreground">{vehicles.length} vehicles · scroll to browse</span></div>
              <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2" style={{ width: "100%", minWidth: 0, maxWidth: "100%", overflowX: "auto" }}>
                {vehicles.map(x => (
                  <button key={x.id} type="button" aria-pressed={x.id === v.id} onClick={() => setSelection({ origin: vehicle!.id, id: x.id })} className={`flex w-52 shrink-0 items-center gap-2 rounded-xl border p-2 text-left transition-colors ${x.id === v.id ? "border-primary bg-card ring-1 ring-primary/30" : "bg-card/60 hover:bg-card"}`}>
                    <div className="min-w-0 flex-1"><div className="truncate font-semibold text-xs">{x.reg}</div><div className="mt-1 text-[11px] text-muted-foreground">{x.type} · {plan?.trips.some(t => t.vehicleId === x.id) ? "Planned" : x.status}</div></div>
                    <div className="relative h-12 w-20 shrink-0"><Image src={VEHICLE_PHOTO[x.type].src} alt="" fill sizes="80px" className="rounded object-contain" /></div>
                  </button>
                ))}
              </div>
            </section>
            <div className="grid w-full min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
                <div className="p-4"><h3 className="font-semibold">Planned route</h3><p className="mt-1 text-xs text-muted-foreground">{trip ? `${trip.stops.length} stops · ${Math.round(trip.distanceKm)} km estimated` : "No trip allocated"}</p></div>
                {trip ? <DispatchMap key={trip.id} trips={[trip]} customers={routeCustomers} ctx={ctx} state="" /> : <div className="grid min-h-56 place-items-center bg-muted/30 text-xs text-muted-foreground">No route planned for this vehicle. Select an allocated vehicle to view its route.</div>}
              </section>
              <section className="min-w-0 rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Assigned deliveries <span className="ml-1 text-xs text-muted-foreground">({stops.length})</span></h3>{trip && <Tag tone="gray">Planned</Tag>}</div>
                {trip ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50 text-muted-foreground"><tr>{["Stop", "Delivery", "Customer", "Destination", "Load", "ETA"].map(h => <th key={h} scope="col" className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{stops.map((s,i) => {const c = routeCustomers[i];return <tr key={s.key} className="border-b"><td className="px-2 py-3">{i+1}</td><td className="px-2 py-3 font-mono">{s.deliveryId}{s.part && <span className="block text-muted-foreground">Part {s.part.n}/{s.part.of}</span>}</td><td className="px-2 py-3 font-medium">{c.name}</td><td className="px-2 py-3">{c.city}</td><td className="whitespace-nowrap px-2 py-3">{(s.weightKg/1000).toFixed(2)} T</td><td className="whitespace-nowrap px-2 py-3">{fmtHour(trip.etas[i])}</td></tr>})}</tbody></table></div> : <div className="grid min-h-40 place-items-center rounded-lg bg-muted/30 text-xs text-muted-foreground">No deliveries assigned to this vehicle.</div>}
                {trip && <UtilBar value={trip.util} className="mt-4" />}
                {!!trip?.violations.length && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{trip.violations.join(" · ")}</p>}
              </section>
            </div>
            <div className="min-w-0 space-y-5 px-5 pb-5">
              {v.statusNote && <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"><Wrench className="size-3.5 shrink-0" />{v.statusNote}</div>}

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Gauge className="size-3.5" />Capacity</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Spec l="Rated" v={`${t.ratedKg / 1000} T`} />
                  <Spec l="Usable" v={`${t.usableKg / 1000} T`} />
                  <Spec l="Volume" v={`${t.volM3} m³`} />
                  <Spec l="Body length" v={`${t.lengthFt} ft`} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><MapPin className="size-3.5" />Availability</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Spec l="Home depot" v={<>{v.location}<div className="text-[11px] font-normal text-muted-foreground">{sp?.name}</div></>} />
                  <Spec l="Ready from" v={fmtHour(v.availableFromH)} />
                  <Spec l="Data source" v={<span className="text-xs">{v.source}</span>} />
                  <Spec l={v.ownership === "Company" ? "Running cost" : "Market rate"} v={v.ownership === "Company" ? `${inr(t.companyRate)}/km` : `${inr(t.marketRate)}/km`} />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{v.ownership === "Company" ? `Plus ${inr(t.companyFixed)} fixed per trip (driver, overhead); charged on the round trip.` : `Minimum charge ${inr(t.marketMin)} per trip, one-way billing.`}</div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-3.5" />State permits</h3>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATES.map((s) => { const ok = v.permitStates.includes(s); return <span key={s} className={ok ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400" : "rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground line-through"}>{s}</span> })}
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {trip && <Button variant="outline" render={<Link href="/planning" />}>Open in workbench</Button>}
                {v.status !== "Assigned" && (
                  <Button variant={v.status === "Available" ? "destructive" : "default"} onClick={() => { const next = v.status === "Available" ? "Unavailable" : "Available"; setVehicleStatus(v.id, next); toast(`${v.reg} marked ${next.toLowerCase()}`, { description: "Re-run optimization to apply. Correction logged." }); close() }}>{v.status === "Available" ? "Mark unavailable" : "Mark available"}</Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
