"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Map as MapIcon, MapPin, Package, Search, ShieldCheck, X } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { DEMO_TRACKING_HOUR, distKm, fmtHour, formatPlanDate, inr, SHIPPING_POINTS, VEHICLE_TYPES, type VehicleTypeName } from "@/lib/data"
import { validateDelivery } from "@/lib/optimizer"
import { buildLive, VEHICLE_PHOTO } from "@/lib/tracking"
import { DispatchMap } from "@/components/app/dispatch-map"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/app/bits"

type Stage = "Planned" | "Partial" | "Unplanned" | "Blocked" | "Excluded"
const stages = ["All", "Planned", "Partial", "Unplanned", "Blocked", "Excluded"] as const
type Filter = typeof stages[number]
const stageStyles: Record<Stage, string> = {
  Planned: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
  Partial: "bg-violet-100 text-violet-900 dark:bg-violet-900 dark:text-violet-100",
  Unplanned: "bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
  Blocked: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
  Excluded: "bg-muted text-muted-foreground",
}
const kg = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " kg"

function Status({ stage }: { stage: Stage }) {
  return <span className={"inline-flex shrink-0 rounded px-2 py-1 text-[11px] font-semibold " + stageStyles[stage]}>{stage === "Partial" ? "Partially planned" : stage}</span>
}

// Reuse the same representative vehicle photographs as Fleet & vehicles.
function DeliveryVehiclePhoto({ type, className = "" }: { type: VehicleTypeName; className?: string }) {
  const photo = VEHICLE_PHOTO[type]
  return <div className={"relative w-full overflow-hidden rounded-md border bg-muted/30 " + className}><Image src={photo.src} alt={photo.model + " — representative " + type} fill sizes="(min-width:1280px) 180px, 35vw" className="object-contain" /></div>
}

// Geographic preview uses the same projection and background as the overview map.
function LocationPreview({ origin, destination, position, expanded }: { origin: {lat:number;lng:number}; destination: {lat:number;lng:number}; position?: {lat:number;lng:number}; expanded?: boolean }) {
  const project = (p: {lat:number;lng:number}) => ({x:(p.lng-69.9)*40,y:(21-p.lat)*40})
  const a=project(origin), b=project(destination), p=position ? project(position) : undefined
  const pts=[a,b,...(p?[p]:[])]
  const cx=(Math.min(...pts.map(x=>x.x))+Math.max(...pts.map(x=>x.x)))/2
  const cy=(Math.min(...pts.map(x=>x.y))+Math.max(...pts.map(x=>x.y)))/2
  const w=Math.max(90,Math.max(...pts.map(x=>x.x))-Math.min(...pts.map(x=>x.x))+42)
  const h=Math.max(65,Math.max(...pts.map(x=>x.y))-Math.min(...pts.map(x=>x.y))+42)
  return <svg role="img" aria-label="Geographic preview showing depot, customer and approximate simulated vehicle position when available" viewBox={`${cx-w/2} ${cy-h/2} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className={`block w-full bg-[#123e36] ${expanded?"h-64":"h-36"}`}>
    <image href="/operations-map.webp" x="-120" y="-120" width="960" height="760"/>
    <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#a9edb8" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" fill="none"/>
    <circle cx={a.x} cy={a.y} r="3" fill="#60a5fa" stroke="white" strokeWidth=".8"/><circle cx={b.x} cy={b.y} r="3" fill="#86efac" stroke="white" strokeWidth=".8"/>
    {p && <g><circle cx={p.x} cy={p.y} r="4" fill="#fbbf24" stroke="#172d28" strokeWidth="1"/><circle cx={p.x} cy={p.y} r="1.3" fill="#172d28"/></g>}
  </svg>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><div className="mb-1 text-xs text-muted-foreground">{label}</div><div className="break-words text-sm font-medium leading-snug">{children}</div></div>
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm"><h3 className="mb-4 text-sm font-semibold">{title}</h3>{children}</section>
}

const PAGE_SIZE = 6

export default function Deliveries() {
  const { deliveries, customers, params, exceptions, grantException, plan, ctx, status } = useStore()
  const [q, setQ] = useState("")
  const [sp, setSp] = useState("all")
  const [stateF, setStateF] = useState("all")
  const [filter, setFilter] = useState<Filter>("All")
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const [tripId, setTripId] = useState<string | null>(null)

  const all = deliveries.map(d => {
    const c = customers.find(c => c.id === d.customerId)!
    const validation = validateDelivery(d, c, params, exceptions)
    const allocations = (plan?.trips ?? []).flatMap(t => t.stops.flatMap((stop, index) => stop.deliveryId === d.id ? [{ t, stop, index, vehicle: ctx.vehicles[t.vehicleId] }] : []))
    const allocatedKg = allocations.reduce((n, a) => n + a.stop.weightKg, 0)
    const stage: Stage = validation.state === "Excluded" ? "Excluded" : validation.state === "Blocked" ? "Blocked" : allocatedKg >= d.weightKg && allocations.length ? "Planned" : allocations.length ? "Partial" : "Unplanned"
    const exampleType = validation.state === "Eligible" ? Object.values(VEHICLE_TYPES).filter(t => t.usableKg >= d.weightKg && t.volM3 >= d.volumeM3 && (!c.maxLengthFt || t.lengthFt <= c.maxLengthFt) && (!c.allowedTypes || c.allowedTypes.includes(t.name))).sort((a,b) => a.usableKg-b.usableKg)[0]?.name : undefined
    return { d, c, validation, allocations, allocatedKg, stage, exampleType }
  })
  const scoped = all.filter(r => (sp === "all" || r.d.shippingPoint === sp) && (stateF === "all" || r.c.state === stateF) && (r.d.id + " " + r.d.salesOrder + " " + r.c.name + " " + r.c.city + " " + r.c.state + " " + r.stage + " " + r.allocations.map(a => a.vehicle?.reg ?? "").join(" ")).toLowerCase().includes(q.trim().toLowerCase()))
  const counts = Object.fromEntries(stages.map(k => [k, k === "All" ? scoped.length : scoped.filter(r => r.stage === k).length])) as Record<Filter, number>
  const rows = scoped.filter(r => filter === "All" || r.stage === filter)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const activePage = Math.min(page, pages - 1)
  const visible = rows.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE)
  const selected = selectedId === null ? undefined : visible.find(r => r.d.id === selectedId) ?? (selectedId === undefined ? visible.find(r => r.stage === "Planned") : undefined) ?? visible[0]
  const allocation = selected?.allocations.find(a => a.t.id === tripId) ?? selected?.allocations[0]
  const vehicle = allocation?.vehicle
  const trip = allocation?.t
  const cap = vehicle ? VEHICLE_TYPES[vehicle.type] : undefined
  const origin = selected && SHIPPING_POINTS.find(p => p.id === selected.d.shippingPoint)
  const destination = selected && selected.c.lat != null && selected.c.lng != null ? { lat: selected.c.lat, lng: selected.c.lng } : undefined
  const demoLocation = trip && origin && trip.stops.length ? buildLive(trip, ctx, origin, DEMO_TRACKING_HOUR) : undefined
  const distance = origin && destination ? Math.round(distKm(origin, destination)) : undefined
  const routeCustomers = trip?.stops.map(s => ctx.customers[ctx.deliveries[s.deliveryId].customerId]) ?? []
  const selectDelivery = (id: string) => { setSelectedId(id); setTripId(null); setMapOpen(false); if (window.innerWidth < 1280) requestAnimationFrame(() => document.getElementById("shipment-details")?.scrollIntoView({ block: "start", behavior: "smooth" })) }
  const resetSelection = () => { setSelectedId(undefined); setTripId(null); setMapOpen(false); setPage(0) }

  return (
    <div className="delivery-workspace min-w-0 xl:flex xl:h-[calc(100dvh-3.25rem)] xl:min-h-[38rem] xl:flex-col">
      <PageHeader photo="deliveries" title="Deliveries" desc="Plan, allocate and track outbound shipments across your network." />
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm xl:min-h-0 xl:flex-1">
      <div className="grid min-w-0 xl:h-full xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] xl:overflow-hidden">
        <section aria-label="Deliveries" className="min-w-0 bg-muted/25 xl:min-h-0 xl:overflow-y-auto xl:border-r">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-5">
            <div><h2 className="text-xl font-semibold tracking-tight">Shipments</h2><p className="mt-1 text-[11px] text-muted-foreground">Sample dispatch data</p></div>
            <div className="relative min-w-0 flex-1 sm:min-w-44"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search deliveries" value={q} onChange={e => {setQ(e.target.value);resetSelection()}} placeholder="Search ID, customer, city…" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          </header>
          <nav aria-label="Shipment status filters" className="flex min-w-0 gap-4 overflow-x-auto border-b px-5">
            {stages.map(k => <button type="button" key={k} aria-pressed={filter === k} onClick={() => {setFilter(k);resetSelection()}} className={"flex shrink-0 items-center gap-1.5 border-b-2 py-3.5 text-sm " + (filter === k ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")} >{k}<span className="rounded bg-background px-1.5 py-0.5 text-[10px] tabular-nums">{counts[k]}</span></button>)}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <select aria-label="Shipping point" value={sp} onChange={e => {setSp(e.target.value);resetSelection()}} className="h-9 max-w-full rounded-md border bg-card px-3 text-xs"><option value="all">All shipping points</option>{SHIPPING_POINTS.map(p => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select>
            <select aria-label="Destination state" value={stateF} onChange={e => {setStateF(e.target.value);resetSelection()}} className="h-9 max-w-full rounded-md border bg-card px-3 text-xs"><option value="all">All destination states</option>{Array.from(new Set(customers.map(c => c.state))).sort().map(state => <option key={state} value={state}>{state}</option>)}</select>
            <span className="text-xs text-muted-foreground">{rows.length} deliveries</span>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {visible.map(r => {
              const a = r.allocations[0]
              const photoType = a?.vehicle?.type ?? r.exampleType
              const active = selected?.d.id === r.d.id
              return <button type="button" key={r.d.id} onClick={() => selectDelivery(r.d.id)} aria-pressed={active} className={"min-w-0 overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " + (active ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:border-muted-foreground/60")}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><span className="text-lg font-semibold tracking-tight">#{r.d.id}</span><Status stage={r.stage} /></div>
                <div className="relative p-4">
                  <div className="mb-3 min-w-0"><div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="size-3" /> Destination</div><div className="truncate text-sm font-semibold" title={r.c.name}>{r.c.name}</div><div className="truncate text-xs text-muted-foreground">{r.c.city}, {r.c.state}</div></div>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-end gap-2"><div className="min-w-0 space-y-2">
                    <div><div className="text-[11px] text-muted-foreground">{a ? "Planned ETA" : "Requested date"}</div><div className="text-xs font-medium">{a ? fmtHour(a.t.etas[a.index]) : formatPlanDate(r.d.deliveryDate)}</div></div>
                    <div><div className="text-[11px] text-muted-foreground">Assigned vehicle</div><div className="break-words text-xs font-medium">{a?.vehicle?.reg ?? "Not allocated"}</div></div>
                  </div>
                  <div className="min-w-0 text-right">{photoType ? <><DeliveryVehiclePhoto type={photoType} className="h-[92px]" /><div className="mt-1 text-[10px] leading-tight text-muted-foreground">{a?.vehicle ? photoType : photoType + " · example only"}</div></> : <span className="text-[11px] text-muted-foreground">{(r.d.weightKg / 1000).toFixed(2)} T</span>}</div></div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Package className="size-3" />{(r.d.weightKg/1000).toFixed(2)} T</span><span>{r.d.volumeM3.toFixed(1)} m³</span><span>{r.d.shippingPoint}</span></div>
                </div>
              </button>
            })}
            {!visible.length && <div className="col-span-full rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">No deliveries match these filters.</div>}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground"><span>{rows.length ? activePage * PAGE_SIZE + 1 : 0}–{Math.min((activePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span><div className="flex items-center gap-2"><Button size="icon-sm" variant="outline" aria-label="Previous page" disabled={activePage === 0} onClick={() => {setPage(activePage-1);setSelectedId(undefined);setTripId(null);setMapOpen(false)}}><ChevronLeft /></Button><span>Page {activePage+1} / {pages}</span><Button size="icon-sm" variant="outline" aria-label="Next page" disabled={activePage+1 >= pages} onClick={() => {setPage(activePage+1);setSelectedId(undefined);setTripId(null);setMapOpen(false)}}><ChevronRight /></Button></div></footer>
        </section>
        <section id="shipment-details" aria-label="Shipment details" className="min-w-0 bg-card xl:min-h-0 xl:overflow-y-auto">
          {selected ? <>
            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-card px-5 py-5"><div className="min-w-0"><h2 className="truncate text-xl font-semibold tracking-tight">Shipment #{selected.d.id}</h2><p className="mt-1 text-xs text-muted-foreground">SO {selected.d.salesOrder}</p></div><Button size="icon-sm" variant="outline" aria-label="Close shipment details" onClick={() => setSelectedId(null)}><X /></Button></header>
            <div className="min-w-0 space-y-3 p-5">
              <section className="relative min-w-0 rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-semibold tracking-tight">#{selected.d.id}</h3><Status stage={selected.stage} /></div>
                <div className="relative grid grid-cols-2 gap-4">
                  <Field label="Delivery destination">{selected.c.name}<div className="mt-1 text-xs font-normal text-muted-foreground">{selected.c.city}, {selected.c.state}</div></Field>
                  <Field label={allocation ? "Planned ETA" : "Requested date"}>{allocation ? fmtHour(allocation.t.etas[allocation.index]) : formatPlanDate(selected.d.deliveryDate)}</Field>
                  <Field label="Assigned vehicle">{vehicle?.reg ?? "Not allocated"}{vehicle && <div className="text-xs font-normal text-muted-foreground">{vehicle.ownership} · {vehicle.type}</div>}</Field>
                  {vehicle ? <div className="min-w-0 self-end"><DeliveryVehiclePhoto type={vehicle.type} className="h-24" /><p className="mt-1 text-[10px] text-muted-foreground">{VEHICLE_PHOTO[vehicle.type].model} · representative photo</p></div> : selected.exampleType ? <div className="min-w-0"><DeliveryVehiclePhoto type={selected.exampleType} className="h-24" /><p className="mt-1 text-[10px] text-muted-foreground">{selected.exampleType} · capacity example only</p></div> : <Field label="Ship from">{selected.d.shippingPoint}</Field>}
                </div>
                <div className="mt-5 border-t pt-4">
                  <div className="grid grid-cols-4 gap-1">
                    {["SAP released","Eligible","Allocated","Published"].map((label,i) => {
                      const done = i===0 ? selected.d.sapStatus==="Released" : i===1 ? selected.validation.state==="Eligible" : i===2 ? selected.stage==="Planned" : selected.stage==="Planned" && status==="Published"
                      return <div key={label} className="min-w-0"><div className={"mb-2 flex h-1 items-center " + (done?"bg-foreground":"bg-muted")}><span className={"grid size-3 place-items-center rounded-full " + (done?"bg-foreground text-background":"bg-muted ring-1 ring-border")}>{done && <Check className="size-2" />}</span></div><div className={"text-[10px] leading-tight " + (done?"font-medium":"text-muted-foreground")}>{label}</div></div>
                    })}
                  </div>
                  <p className="mt-3 text-[10px] text-muted-foreground">Planning lifecycle · not live delivery tracking</p>
                </div>
                {selected.allocations.length > 1 && <div className="mt-4"><label className="mb-1 block text-xs text-muted-foreground" htmlFor="shipment-trip">Split shipment allocation</label><select id="shipment-trip" value={trip?.id ?? ""} onChange={e => {setTripId(e.target.value);setMapOpen(false)}} className="w-full rounded border bg-background p-2 text-xs">{selected.allocations.map(a => <option key={a.stop.key} value={a.t.id}>{a.t.id} · {a.vehicle?.reg} · {kg(a.stop.weightKg)}</option>)}</select></div>}
              </section>
              <div className="grid min-w-0 gap-3 min-[600px]:grid-cols-2">
                <div className="min-w-0 space-y-3">
                  <Panel title="Route metrics">
                    <div className="space-y-4">
                      <Field label={trip ? "Estimated trip distance" : "Estimated depot-to-customer distance"}>{trip ? Math.round(trip.distanceKm) + " km" : distance != null ? distance + " km" : "Coordinates missing"}</Field>
                      <div className="space-y-3 border-l-2 border-dashed border-primary/30 pl-3"><Field label="Origin">{origin?.name ?? selected.d.shippingPoint}<div className="text-xs font-normal text-muted-foreground">{selected.d.shippingPoint}</div></Field><Field label="Destination">{selected.c.city}, {selected.c.state}</Field></div>
                      <Field label="Planned stop">{allocation ? (allocation.index+1) + " of " + allocation.t.stops.length : "Not allocated"}</Field>
                      {demoLocation && <><Field label="Simulated vehicle location">{demoLocation.pos.lat.toFixed(4)}, {demoLocation.pos.lng.toFixed(4)}<div className="text-xs font-normal text-muted-foreground">{demoLocation.phase} · {fmtHour(DEMO_TRACKING_HOUR)} demo time</div></Field>{demoLocation.nextStop && <Field label="Next simulated stop">{demoLocation.nextStop.name} · {fmtHour(demoLocation.nextStop.eta)}</Field>}</>}
                      <Field label="Customer coordinates">{selected.c.lat != null && selected.c.lng != null ? selected.c.lat + ", " + selected.c.lng : "Missing"}</Field>
                    </div>
                  </Panel>
                  <Panel title="Package details">
                    <div className="mb-4"><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Weight allocated</span><span className="font-semibold tabular-nums">{Math.round(selected.allocatedKg / selected.d.weightKg * 100)}%</span></div><div className="h-2.5 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-foreground" style={{width: Math.min(100, selected.allocatedKg / selected.d.weightKg * 100) + "%"}} /></div></div>
                    <div className="grid grid-cols-2 gap-4"><Field label="Weight">{kg(selected.d.weightKg)}</Field><Field label="Total volume">{selected.d.volumeM3} m³</Field><Field label="Line items">{selected.d.items.length}</Field><Field label="Order value">{inr(selected.d.value)}</Field></div>
                    <div className="mt-4"><Field label="Customer category">{selected.c.category}</Field></div>
                  </Panel>
                </div>
                <div className="min-w-0 space-y-3">
                  <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="relative">
                      {origin && destination ? <LocationPreview origin={origin} destination={destination} position={demoLocation?.pos} /> : <div className="grid h-36 place-items-center bg-muted p-3 text-center text-xs text-muted-foreground"><MapPin className="size-5" /> Customer coordinates missing</div>}
                      {origin && destination && <div className="absolute bottom-2 right-2"><Button size="sm" onClick={() => setMapOpen(x => !x)} aria-expanded={mapOpen} className="bg-[#123e36] text-white hover:bg-[#205449]"><MapIcon /> {mapOpen ? "Hide map" : "Map view"}</Button></div>}
                    </div>
                    <div className="flex flex-wrap gap-2 px-3 py-2 text-[10px] text-muted-foreground"><span>🔵 Depot</span><span>🟢 Customer</span>{demoLocation && <span>🟡 Simulated vehicle</span>}<span className="w-full">Approximate location preview · not live GPS</span></div>
                  </section>
                  <Panel title={vehicle ? "Truck " + vehicle.reg : "Vehicle assignment"}>
                    {vehicle && trip && cap ? <div className="space-y-4">
                      <div><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Trip utilization</span><span className="font-semibold">{Math.round(trip.util*100)}%</span></div><div className="h-2.5 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-foreground" style={{width: Math.min(100,trip.util*100)+"%"}} /></div></div>
                      <Field label="Trip reference">{trip.id}</Field><Field label="Payload / usable capacity">{kg(trip.weightKg)} / {kg(cap.usableKg)}</Field><Field label="Volume / capacity">{trip.volumeM3.toFixed(1)} / {cap.volM3} m³</Field><Field label="Estimated trip cost">{inr(trip.cost)}</Field>
                      <Link href="/planning" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open planning workbench <ArrowUpRight className="size-3" /></Link>
                    </div> : <p className="text-xs leading-relaxed text-muted-foreground">No vehicle allocated in the current plan. Review the planning rules or unplanned loads.</p>}
                  </Panel>
                </div>
              </div>
              {mapOpen && origin && destination && <section className="overflow-hidden rounded-xl border"><div className="flex items-center justify-between p-3"><h3 className="text-sm font-semibold">{trip ? "Planned route · " + trip.id : "Depot to customer · approximate"}</h3><Button variant="ghost" size="icon-sm" aria-label="Close map" onClick={()=>setMapOpen(false)}><X /></Button></div>{trip ? <DispatchMap key={trip.id} trips={[trip]} customers={routeCustomers} ctx={ctx} state="" /> : <LocationPreview origin={origin} destination={destination} expanded />}</section>}
              <Panel title="Appointment & planning rules">
                <div className="grid grid-cols-2 gap-4"><Field label="Requested date">{formatPlanDate(selected.d.deliveryDate)}</Field><Field label="SAP status">{selected.d.sapStatus}</Field><Field label="Appointment">{selected.d.appointment ? selected.d.appointment.status : selected.c.requiresAppointment ? "Missing" : "Not required"}</Field><Field label="Priority">{selected.d.priority}</Field><Field label="Splitting">{selected.d.splittable?"Allowed":"Not allowed"}</Field><Field label="Vehicle restriction">{selected.c.ownVehicleOnly?"Company only":"Eligible company or market"}</Field></div>
                {selected.d.appointment && <div className="mt-3"><Field label="Appointment window">{selected.d.appointment.date} · {selected.d.appointment.start}–{selected.d.appointment.end}</Field></div>}
                <p className="mt-3 text-xs text-muted-foreground">{[selected.c.unloading, selected.c.maxLengthFt && "Max " + selected.c.maxLengthFt + " ft", selected.c.allowedTypes?.join(", ")].filter(Boolean).join(" · ")}</p>
                {selected.d.modifiedAfterPlanning && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Changed after planning</p>}
                {selected.d.note && <p className="mt-2 text-xs text-muted-foreground">{selected.d.note}</p>}
                {selected.validation.issues.length > 0 && <div className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-3 text-xs"><div className="font-semibold">Planning issues</div><ul className="mt-1 list-disc pl-4">{selected.validation.issues.map(i=><li key={i}>{i}</li>)}</ul>{selected.validation.state==="Blocked" && selected.c.requiresAppointment && selected.c.lat!=null && selected.c.lng!=null && selected.validation.issues.some(i=>/appointment/i.test(i)) && <Button size="sm" variant="outline" className="mt-3" onClick={()=>{grantException(selected.d.id);toast.success("Demo exception granted")}}><ShieldCheck /> Grant demo exception</Button>}</div>}
                {exceptions.has(selected.d.id) && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Demo appointment exception recorded</p>}
                {(plan?.unplanned ?? []).filter(u=>u.stop.deliveryId===selected.d.id).map(u=><p key={u.stop.key} className="mt-2 rounded bg-muted p-2 text-xs">{u.kind}: {u.reason}</p>)}
              </Panel>
              <Panel title={"Line items (" + selected.d.items.length + ")"}>
                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th scope="col" className="p-2 font-medium">Material</th><th scope="col" className="p-2 text-right font-medium">Qty</th><th scope="col" className="p-2 text-right font-medium">Weight</th></tr></thead><tbody>{selected.d.items.map((i,k)=><tr key={k} className="border-b"><td className="p-2">{i.description}<div className="text-[10px] text-muted-foreground">{i.material}</div></td><td className="whitespace-nowrap p-2 text-right">{i.qty} {i.uom}</td><td className="whitespace-nowrap p-2 text-right">{kg(i.weightKg)}</td></tr>)}</tbody></table></div>
              </Panel>
              <p className="text-[11px] text-muted-foreground">Sample dispatch data. Photos are representative. Location markers are simulated from the draft plan at 11:30; dashed depot-to-customer lines are approximate, not road navigation. Live GPS and POD are not connected.</p>
            </div>
          </> : <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-muted-foreground">Select a delivery to view its shipment details.</div>}
        </section>
      </div>
      </div>
    </div>
  )
}
