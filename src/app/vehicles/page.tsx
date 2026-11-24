"use client"

import { useState } from "react"
import { VehicleDialog } from "@/components/app/vehicle-dialog"
import { ChevronRight } from "lucide-react"
import type { Vehicle } from "@/lib/data"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { SHIPPING_POINTS, VEHICLE_TYPES, fmtHour } from "@/lib/data"
import { PageHeader, Tag } from "@/components/app/bits"
import { VehiclePhoto } from "@/components/app/vehicle-photo"
import { VEHICLE_PHOTO } from "@/lib/tracking"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Vehicles() {
  const { vehicles, setVehicleStatus, plan } = useStore()
  const [own, setOwn] = useState("all")
  const [sp, setSp] = useState("all")
  const [sel, setSel] = useState<Vehicle | null>(null)
  const rows = vehicles.filter((v) => (own === "all" || v.ownership === own) && (sp === "all" || v.location === sp))
  const tripOf = (id: string) => plan?.trips.find((t) => t.vehicleId === id)?.id
  const allocated = new Set(plan?.trips.map(t => t.vehicleId) ?? [])
  const avail = vehicles.filter((v) => v.status === "Available")
  return (
    <>
      <PageHeader photo="fleet" title="Vehicles & availability" desc="Sample fleet and editable availability. Rated and usable capacity are shown separately." />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[["Total fleet", vehicles.length], ["Company fleet", vehicles.filter(v => v.ownership === "Company").length], ["Allocated in plan", allocated.size], ["Available, not allocated", avail.filter(v => !allocated.has(v.id)).length]].map(([l, n]) => (
          <div key={l} className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{n}</div></div>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(VEHICLE_TYPES) as (keyof typeof VEHICLE_TYPES)[]).map((k) => {
          const t = VEHICLE_TYPES[k]
          const all = vehicles.filter((v) => v.type === k)
          const free = all.filter((v) => v.status === "Available" && !allocated.has(v.id)).length
          return (
            <div key={k} className="group overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative">
                <VehiclePhoto type={k} className="aspect-[16/10] w-full rounded-none ring-0 transition duration-500 group-hover:scale-105" sizes="(min-width:1024px) 20vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-white"><div><div className="text-sm font-semibold leading-tight">{k}</div><div className="text-[11px] text-white/70">{VEHICLE_PHOTO[k].model}</div></div><span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-black">{free}/{all.length} free</span></div>
              </div>
              <div className="flex justify-between px-3 py-2 text-[11px] text-muted-foreground"><span>{t.usableKg / 1000}T usable</span><span>{t.volM3} m³</span><span>{t.lengthFt} ft</span></div>
            </div>
          )
        })}
      </div>
      <Card><CardContent>
        <div className="mb-3 flex gap-2">
          <Select items={{ all: "All ownership", Company: "Company", Market: "Market" }} value={own} onValueChange={(v) => setOwn(v ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ownership</SelectItem><SelectItem value="Company">Company</SelectItem><SelectItem value="Market">Market</SelectItem></SelectContent></Select>
          <Select items={{ all: "All locations", ...Object.fromEntries(SHIPPING_POINTS.map((s) => [s.id, s.id])) }} value={sp} onValueChange={(v) => setSp(v ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{SHIPPING_POINTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.id}</SelectItem>)}</SelectContent></Select>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Registration</TableHead><TableHead>Type</TableHead><TableHead>Ownership</TableHead><TableHead className="text-right">Rated / usable</TableHead><TableHead className="text-right">Volume</TableHead><TableHead>Location</TableHead><TableHead>Ready from</TableHead><TableHead>Permits</TableHead><TableHead>Status</TableHead><TableHead>Plan</TableHead><TableHead></TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((v) => {
              const t = VEHICLE_TYPES[v.type]
              const trip = tripOf(v.id)
              return (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setSel(v)}>
                  <TableCell><div className="flex items-center gap-3"><VehiclePhoto type={v.type} className="w-16" sizes="64px" /><div><div className="font-mono text-xs">{v.reg}</div><div className="text-[10px] text-muted-foreground">{v.source}</div></div></div></TableCell>
                  <TableCell className="text-sm">{v.type}</TableCell>
                  <TableCell><Tag tone={v.ownership === "Company" ? "blue" : "amber"}>{v.ownership}</Tag></TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{t.ratedKg / 1000}T / {t.usableKg / 1000}T</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{t.volM3} m³</TableCell>
                  <TableCell className="text-xs">{v.location}<div className="text-[11px] text-muted-foreground">{SHIPPING_POINTS.find(s => s.id === v.location)?.name}</div></TableCell>
                  <TableCell className="text-xs">{fmtHour(v.availableFromH)}</TableCell>
                  <TableCell className="max-w-32 text-xs text-muted-foreground">{v.permitStates.length === 5 ? "All 5 states" : v.permitStates.map((s) => s.split(" ").map((w) => w[0]).join("")).join(", ")}</TableCell>
                  <TableCell><Tag tone={v.status === "Available" ? "green" : v.status === "Assigned" ? "amber" : "red"}>{v.status}</Tag>{v.statusNote && <div className="mt-0.5 max-w-44 text-[11px] text-muted-foreground">{v.statusNote}</div>}</TableCell>
                  <TableCell className="text-xs">{trip ?? "—"}</TableCell>
                  <TableCell>
                    {v.status !== "Assigned" && (
                      <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setVehicleStatus(v.id, v.status === "Available" ? "Unavailable" : "Available"); toast(`${v.reg} marked ${v.status === "Available" ? "unavailable" : "available"}`, { description: "Re-run optimization to apply. Correction logged." }) }}>{v.status === "Available" ? "Mark unavailable" : "Mark available"}</Button>
                    )}
                  </TableCell>
                  <TableCell><ChevronRight className="size-4 text-muted-foreground" /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
      <VehicleDialog vehicle={sel ? vehicles.find((x) => x.id === sel.id) ?? sel : null} onClose={() => setSel(null)} />
    </>
  )
}
