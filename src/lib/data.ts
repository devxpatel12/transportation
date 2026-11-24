// Mock master + transactional data for the prototype.
// Deterministic (seeded) so server and client renders match.

export type Category = "Modern Trade" | "Regular" | "Other"
export type Priority = "High" | "Normal" | "Low"
export type Ownership = "Company" | "Market"
export type VehicleTypeName = "Ace 1T" | "LCV 3T" | "ICV 6T" | "HCV 10T" | "MCV 16T"

export const PLAN_DATE = "2026-11-20"
export const DEMO_TRACKING_HOUR = 11.5 // 11:30 on the sample planning date
export const DISPATCH_HOUR = 6 // default dispatch 06:00 on plan date

export interface ShippingPoint {
  id: string
  name: string
  state: string
  lat: number
  lng: number
}

export const SHIPPING_POINTS: ShippingPoint[] = [
  { id: "BLR-01", name: "Hoskote DC", state: "Karnataka", lat: 13.07, lng: 77.8 },
  { id: "MAA-01", name: "Sriperumbudur DC", state: "Tamil Nadu", lat: 12.97, lng: 79.94 },
  { id: "HYD-01", name: "Medchal DC", state: "Telangana", lat: 17.63, lng: 78.48 },
  { id: "PNQ-01", name: "Chakan DC", state: "Maharashtra", lat: 18.76, lng: 73.86 },
]

export interface VehicleType {
  name: VehicleTypeName
  ratedKg: number
  usableKg: number
  volM3: number
  lengthFt: number
  marketRate: number // INR / km (one-way)
  marketMin: number // INR minimum trip charge
  companyRate: number // INR / km (fuel, maintenance) – charged on round trip
  companyFixed: number // INR per trip (driver, overhead)
}

export const VEHICLE_TYPES: Record<VehicleTypeName, VehicleType> = {
  "Ace 1T": { name: "Ace 1T", ratedKg: 1000, usableKg: 900, volM3: 6, lengthFt: 7, marketRate: 16, marketMin: 2200, companyRate: 7, companyFixed: 400 },
  "LCV 3T": { name: "LCV 3T", ratedKg: 3000, usableKg: 2800, volM3: 14, lengthFt: 10, marketRate: 21, marketMin: 3200, companyRate: 9, companyFixed: 500 },
  "ICV 6T": { name: "ICV 6T", ratedKg: 6000, usableKg: 5600, volM3: 28, lengthFt: 17, marketRate: 28, marketMin: 4500, companyRate: 12, companyFixed: 700 },
  "HCV 10T": { name: "HCV 10T", ratedKg: 10000, usableKg: 9500, volM3: 45, lengthFt: 22, marketRate: 38, marketMin: 6500, companyRate: 15, companyFixed: 900 },
  "MCV 16T": { name: "MCV 16T", ratedKg: 16000, usableKg: 15000, volM3: 70, lengthFt: 32, marketRate: 50, marketMin: 9000, companyRate: 20, companyFixed: 1200 },
}

export interface Customer {
  id: string
  name: string
  category: Category
  city: string
  state: string
  lat: number | null
  lng: number | null
  ownVehicleOnly: boolean
  allowedTypes?: VehicleTypeName[]
  maxLengthFt?: number
  requiresAppointment: boolean
  priority: Priority
  window: string
  unloading: string
}

export interface Appointment {
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string
  status: "Confirmed" | "Requested" | "Cancelled"
  location: string
}

export interface DeliveryItem {
  material: string
  description: string
  qty: number
  uom: string
  weightKg: number
}

export interface Delivery {
  id: string
  salesOrder: string
  customerId: string
  shippingPoint: string
  weightKg: number
  volumeM3: number
  deliveryDate: string
  priority: Priority
  sapStatus: "Released" | "Cancelled" | "Blocked"
  value: number
  splittable: boolean
  modifiedAfterPlanning: boolean
  appointment?: Appointment
  items: DeliveryItem[]
  note?: string
}

export interface Vehicle {
  id: string
  reg: string
  ownership: Ownership
  type: VehicleTypeName
  location: string // shipping point id
  availableFromH: number // hour of plan date
  status: "Available" | "Unavailable" | "Assigned"
  statusNote?: string
  permitStates: string[]
  source: string
}

// ---------- helpers ----------
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x)) * 1.28 // road factor
}

export function absHour(date: string, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const days = Math.round((Date.parse(date) - Date.parse(PLAN_DATE)) / 86400000)
  return days * 24 + h + m / 60
}

export function formatPlanDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(date))
}

export function fmtHour(abs: number) {
  const day = Math.floor(abs / 24)
  const h = Math.floor(abs - day * 24)
  const m = Math.round((abs - Math.floor(abs)) * 60)
  const hh = String(m === 60 ? h + 1 : h).padStart(2, "0")
  const mm = String(m === 60 ? 0 : m).padStart(2, "0")
  return `${day > 0 ? `D+${day} ` : ""}${hh}:${mm}`
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")
export const inrK = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`

// ---------- customers ----------
type C = [string, Category, string, string, number, number, Partial<Customer>?]
const customerSeed: C[] = [
  ["Bharat Fresh Hypermart – Whitefield", "Modern Trade", "Bengaluru", "Karnataka", 12.97, 77.75],
  ["Nandi Value Bazaar – Yelahanka", "Modern Trade", "Bengaluru", "Karnataka", 13.1, 77.59],
  ["Sri Ganesh Traders", "Regular", "Tumakuru", "Karnataka", 13.34, 77.1],
  ["Kaveri Wholesale Mart", "Regular", "Mysuru", "Karnataka", 12.3, 76.64],
  ["Coastal Fresh Stores", "Regular", "Mangaluru", "Karnataka", 12.91, 74.86, { allowedTypes: ["Ace 1T", "LCV 3T", "ICV 6T"], maxLengthFt: 19, unloading: "Narrow lane, max 19ft vehicle" }],
  ["Deccan Distributors", "Regular", "Hubballi", "Karnataka", 15.36, 75.12],
  ["Malnad Agencies", "Other", "Belagavi", "Karnataka", 15.85, 74.5],
  ["Tungabhadra Stores", "Regular", "Davanagere", "Karnataka", 14.47, 75.92],
  ["Vijayanagar Supermart", "Modern Trade", "Ballari", "Karnataka", 15.14, 76.92],
  ["Marina Mega Mart – T Nagar", "Modern Trade", "Chennai", "Tamil Nadu", 13.04, 80.23],
  ["Kapaleeswar Retail – OMR", "Modern Trade", "Chennai", "Tamil Nadu", 12.9, 80.23],
  ["Sakthi Supermarkets", "Modern Trade", "Coimbatore", "Tamil Nadu", 11.0, 76.96, { ownVehicleOnly: true, unloading: "Company vehicles only (gate policy)" }],
  ["Pandian Agencies", "Regular", "Madurai", "Tamil Nadu", 9.92, 78.12],
  ["Salem Steel City Stores", "Regular", "Salem", "Tamil Nadu", 11.66, 78.15],
  ["Cauvery General Traders", "Regular", "Tiruchirappalli", "Tamil Nadu", 10.79, 78.69],
  ["Palar Wholesale", "Regular", "Vellore", "Tamil Nadu", 12.92, 79.13],
  ["Hosur Industrial Canteens", "Other", "Hosur", "Tamil Nadu", 12.74, 77.83],
  ["Erode Textile Mart Stores", "Regular", "Erode", "Tamil Nadu", 11.34, 77.72],
  ["Krishna Delta Mart", "Modern Trade", "Vijayawada", "Andhra Pradesh", 16.51, 80.65],
  ["Vizag Harbour Traders", "Regular", "Visakhapatnam", "Andhra Pradesh", 17.69, 83.22],
  ["Venkateswara Agencies", "Regular", "Tirupati", "Andhra Pradesh", 13.63, 79.42],
  ["Guntur Spice Stores", "Regular", "Guntur", "Andhra Pradesh", 16.31, 80.44],
  ["Pennar Distributors", "Other", "Nellore", "Andhra Pradesh", 14.44, 79.99],
  ["Charminar Hyper – Kukatpally", "Modern Trade", "Hyderabad", "Telangana", 17.49, 78.41],
  ["Cyberabad Fresh – Gachibowli", "Modern Trade", "Hyderabad", "Telangana", 17.44, 78.35],
  ["Secunderabad Cash & Carry", "Regular", "Secunderabad", "Telangana", 17.44, 78.5],
  ["Kakatiya Agencies", "Regular", "Warangal", "Telangana", 17.97, 79.59],
  ["Godavari Stores", "Regular", "Karimnagar", "Telangana", 18.44, 79.13],
  ["Nizam Sagar Traders", "Other", "Nizamabad", "Telangana", 18.67, 78.09],
  ["Sahyadri Mega Mart – Hinjewadi", "Modern Trade", "Pune", "Maharashtra", 18.59, 73.74],
  ["Shivaji Retail – Kharadi", "Modern Trade", "Pune", "Maharashtra", 18.55, 73.94],
  ["Konkan Hypermarket – Andheri", "Modern Trade", "Mumbai", "Maharashtra", 19.12, 72.85],
  ["Godavari Valley Traders", "Regular", "Nashik", "Maharashtra", 19.99, 73.79],
  ["Panchganga Agencies", "Regular", "Kolhapur", "Maharashtra", 16.7, 74.24],
  ["Solapur Chadar Stores", "Regular", "Solapur", "Maharashtra", 17.66, 75.91],
  ["Krishna Valley Mart", "Regular", "Sangli", "Maharashtra", 16.85, 74.57],
  ["Metro Fresh – Hadapsar", "Modern Trade", "Pune", "Maharashtra", 18.5, 73.93], // no appointment (demo)
  ["Rural Connect Stores", "Regular", "Hosur", "Tamil Nadu", NaN, NaN], // missing coordinates (demo)
]

export const CUSTOMERS: Customer[] = customerSeed.map((c, i) => ({
  id: `C${1001 + i}`,
  name: c[0],
  category: c[1],
  city: c[2],
  state: c[3],
  lat: Number.isNaN(c[4]) ? null : c[4],
  lng: Number.isNaN(c[5]) ? null : c[5],
  ownVehicleOnly: false,
  requiresAppointment: c[1] === "Modern Trade",
  priority: c[1] === "Modern Trade" ? "High" : "Normal",
  window: c[1] === "Modern Trade" ? "By appointment" : "08:00 – 19:00",
  unloading: c[1] === "Modern Trade" ? "Dock unloading, 45 min" : "Manual unloading",
  ...(c[6] ?? {}),
}))

// ---------- deliveries ----------
const MATERIALS: [string, string, string][] = [
  ["FG-1001", "Sunflower Oil 1L (cartons)", "CAR"],
  ["FG-1020", "Detergent Powder 1kg (cases)", "CAR"],
  ["FG-1033", "Glucose Biscuits 800g (cartons)", "CAR"],
  ["FG-1047", "Packaged Water 1L (cases)", "CAR"],
  ["FG-1052", "Hand Wash 250ml (cases)", "CAR"],
  ["FG-1064", "Basmati Rice 5kg (bags)", "BAG"],
]

function nearestSP(lat: number, lng: number) {
  return SHIPPING_POINTS.reduce((best, sp) => (distKm(sp, { lat, lng }) < distKm(best, { lat, lng }) ? sp : best)).id
}

function buildDeliveries(): Delivery[] {
  const rng = mulberry32(2026)
  const out: Delivery[] = []
  let seq = 80001000
  let mtIndex = 0
  CUSTOMERS.forEach((c, ci) => {
    if (c.name.startsWith("Metro Fresh") || c.name.startsWith("Rural Connect")) return
    const n = rng() < 0.45 ? 2 : 1
    for (let k = 0; k < n; k++) {
      const base = c.category === "Modern Trade" ? 1800 + rng() * 5700 : c.category === "Regular" ? 500 + rng() * 5000 : 300 + rng() * 2700
      const weightKg = Math.round(base / 10) * 10
      const density = 170 + rng() * 120
      const volumeM3 = Math.round((weightKg / density) * 10) / 10
      const r = rng()
      const priority: Priority = r < 0.12 ? "High" : r < 0.82 ? "Normal" : "Low"
      const nItems = 2 + Math.floor(rng() * 2)
      const items: DeliveryItem[] = Array.from({ length: nItems }, () => {
        const m = MATERIALS[Math.floor(rng() * MATERIALS.length)]
        const w = Math.round(weightKg / nItems)
        return { material: m[0], description: m[1], qty: Math.max(10, Math.round(w / 12)), uom: m[2], weightKg: w }
      })
      const sp = nearestSP(c.lat ?? 13, c.lng ?? 77.6)
      const spObj = SHIPPING_POINTS.find((s) => s.id === sp)!
      let appointment: Appointment | undefined
      if (c.requiresAppointment && c.lat != null && c.lng != null) {
        mtIndex++
        const km = distKm(spObj, { lat: c.lat, lng: c.lng })
        const eta = DISPATCH_HOUR + 1.5 + km / 42
        let day = Math.floor(eta / 24)
        let hour = Math.ceil(eta - day * 24)
        if (hour < 9) hour = 9
        if (hour > 17) {
          day += 1
          hour = 9
        }
        const date = new Date(Date.parse(PLAN_DATE) + day * 86400000).toISOString().slice(0, 10)
        let endH = Math.min(hour + 4, 20)
        let status: Appointment["status"] = "Confirmed"
        if (mtIndex % 6 === 4) status = "Requested" // unconfirmed → blocked
        if (mtIndex % 7 === 3 && day === 0) endH = Math.max(8, hour - 1) // window unreachable → unplanned
        appointment = {
          date,
          start: `${String(Math.min(hour, endH - 1)).padStart(2, "0")}:00`,
          end: `${String(endH).padStart(2, "0")}:00`,
          status,
          location: `${c.city} receiving dock`,
        }
      }
      out.push({
        id: String(seq),
        salesOrder: String(1200000 + ci * 17 + k),
        customerId: c.id,
        shippingPoint: sp,
        weightKg,
        volumeM3,
        deliveryDate: rng() < 0.2 ? "2026-11-21" : PLAN_DATE,
        priority,
        sapStatus: "Released",
        value: Math.round(weightKg * (120 + rng() * 100)),
        splittable: c.category !== "Modern Trade",
        modifiedAfterPlanning: false,
        appointment,
        items,
      })
      seq += 1 + Math.floor(rng() * 3)
    }
  })

  const byName = (s: string) => CUSTOMERS.find((c) => c.name.startsWith(s))!
  const mk = (over: Partial<Delivery> & { customer: string; weightKg: number }): Delivery => {
    const c = byName(over.customer)
    const { customer, ...rest } = over
    void customer
    const w = over.weightKg
    return {
      id: String(seq++),
      salesOrder: String(1290000 + seq),
      customerId: c.id,
      shippingPoint: nearestSP(c.lat ?? 12.74, c.lng ?? 77.83),
      volumeM3: Math.round((w / 220) * 10) / 10,
      deliveryDate: PLAN_DATE,
      priority: "Normal",
      sapStatus: "Released",
      value: Math.round(w * 160),
      splittable: true,
      modifiedAfterPlanning: false,
      items: [{ material: MATERIALS[0][0], description: MATERIALS[0][1], qty: Math.round(w / 12), uom: "CAR", weightKg: w }],
      ...rest,
    }
  }
  // Demo scenarios
  out.push(mk({ customer: "Metro Fresh", weightKg: 4200, splittable: false, note: "No appointment on file" }))
  out.push(mk({ customer: "Rural Connect", weightKg: 1800, note: "Customer geo-coordinates missing in master" }))
  out.push(mk({ customer: "Pennar", weightKg: 2400, sapStatus: "Cancelled", note: "Cancelled in SAP after release" }))
  out.push(mk({ customer: "Deccan Distributors", weightKg: 21500, note: "Bulk order – exceeds any single vehicle (split eligible)" }))
  out.push(mk({ customer: "Malnad", weightKg: 650, priority: "Low", deliveryDate: "2026-11-21", note: "Small, distant load" }))
  out.push(mk({ customer: "Salem Steel", weightKg: 3100, modifiedAfterPlanning: true, note: "Quantity changed in SAP after last plan run" }))
  out.push(mk({ customer: "Sakthi", weightKg: 5200, splittable: false, note: "Own-vehicle-only customer" }))
  out.push(mk({ customer: "Coastal Fresh", weightKg: 5800, splittable: false, note: "Site limit: ≤19ft vehicles" }))
  return out
}

export const DELIVERIES: Delivery[] = buildDeliveries()

// ---------- vehicles ----------
export const ALL_STATES = ["Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Maharashtra"]
type V = [string, Ownership, VehicleTypeName, string, number, Vehicle["status"]?, string?, string[]?]
const vehicleSeed: V[] = [
  ["KA-01-AB-1234", "Company", "ICV 6T", "BLR-01", 6],
  ["KA-01-AC-2211", "Company", "ICV 6T", "BLR-01", 6],
  ["KA-51-CD-9087", "Company", "HCV 10T", "BLR-01", 6],
  ["KA-51-CE-4410", "Company", "HCV 10T", "BLR-01", 9, "Available", "Returning from service – ready 09:00"],
  ["KA-05-MM-7781", "Company", "MCV 16T", "BLR-01", 6],
  ["KA-03-LV-1502", "Company", "LCV 3T", "BLR-01", 6],
  ["KA-01-AD-6620", "Company", "HCV 10T", "BLR-01", 6, "Unavailable", "In workshop – brake service"],
  ["TN-21-BX-3340", "Company", "LCV 3T", "MAA-01", 6],
  ["TN-21-BY-8812", "Company", "HCV 10T", "MAA-01", 6],
  ["TN-21-BZ-1190", "Company", "HCV 10T", "MAA-01", 6],
  ["TN-09-CK-5521", "Company", "ICV 6T", "MAA-01", 7],
  ["TS-08-UA-4410", "Company", "HCV 10T", "HYD-01", 6],
  ["TS-08-UB-7782", "Company", "MCV 16T", "HYD-01", 6],
  ["TS-09-UC-2301", "Company", "ICV 6T", "HYD-01", 6, "Assigned", "Assigned to inter-DC transfer (SAP TR-55021)"],
  ["MH-14-GT-6602", "Company", "HCV 10T", "PNQ-01", 6],
  ["MH-14-GU-1128", "Company", "ICV 6T", "PNQ-01", 6],
  ["KA-02-MK-5001", "Market", "Ace 1T", "BLR-01", 7, "Available", undefined, ["Karnataka", "Tamil Nadu"]],
  ["KA-02-MK-5102", "Market", "ICV 6T", "BLR-01", 7, "Available", undefined, ["Karnataka", "Tamil Nadu", "Andhra Pradesh"]],
  ["KA-04-MK-5230", "Market", "HCV 10T", "BLR-01", 8, "Available", undefined, ["Karnataka", "Maharashtra"]],
  ["KA-04-MK-5231", "Market", "MCV 16T", "BLR-01", 8],
  ["TN-33-MK-6011", "Market", "ICV 6T", "MAA-01", 7, "Available", undefined, ["Tamil Nadu", "Andhra Pradesh", "Karnataka"]],
  ["TN-33-MK-6012", "Market", "HCV 10T", "MAA-01", 7],
  ["TN-33-MK-6013", "Market", "LCV 3T", "MAA-01", 7, "Available", undefined, ["Tamil Nadu"]],
  ["TS-08-UD-3319", "Company", "HCV 10T", "HYD-01", 6],
  ["TS-08-UE-3320", "Company", "LCV 3T", "HYD-01", 6],
  ["TS-07-MK-7031", "Market", "HCV 10T", "HYD-01", 7],
  ["TS-07-MK-7033", "Market", "MCV 16T", "HYD-01", 7, "Available", undefined, ["Telangana", "Andhra Pradesh", "Maharashtra"]],
  ["TS-07-MK-7032", "Market", "ICV 6T", "HYD-01", 7, "Available", undefined, ["Telangana", "Andhra Pradesh"]],
  ["MH-12-MK-8041", "Market", "HCV 10T", "PNQ-01", 7, "Available", undefined, ["Maharashtra", "Karnataka"]],
  ["MH-12-MK-8042", "Market", "LCV 3T", "PNQ-01", 7],
  // Additional fictional company vehicles: 27 company-owned in the demo fleet.
  ["KA-53-DM-2101", "Company", "HCV 10T", "BLR-01", 6],
  ["KA-53-DM-2102", "Company", "MCV 16T", "BLR-01", 6],
  ["KA-53-DM-2103", "Company", "LCV 3T", "BLR-01", 7],
  ["TN-22-DM-2104", "Company", "ICV 6T", "MAA-01", 6],
  ["TN-22-DM-2105", "Company", "HCV 10T", "MAA-01", 6],
  ["TS-07-DM-2106", "Company", "MCV 16T", "HYD-01", 6],
  ["TS-07-DM-2107", "Company", "ICV 6T", "HYD-01", 7],
  ["MH-12-DM-2108", "Company", "HCV 10T", "PNQ-01", 6],
  ["MH-12-DM-2109", "Company", "ICV 6T", "PNQ-01", 6, "Unavailable", "Scheduled preventive maintenance"],
]

export const VEHICLES: Vehicle[] = vehicleSeed.map((v, i) => ({
  id: `V${String(i + 1).padStart(3, "0")}`,
  reg: v[0],
  ownership: v[1],
  type: v[2],
  location: v[3],
  availableFromH: v[4],
  status: v[5] ?? "Available",
  statusNote: v[6],
  permitStates: v[7] ?? ALL_STATES,
  source: v[1] === "Company" ? "Fleet system" : "Transporter API",
}))

// ---------- rules ----------
export interface PlanParams {
  minLoadPct: number
  minDispatchValue: number
  maxStops: number
  clusterRadiusKm: number
  maxCompanyKm: number
  preferCompany: boolean
  allowSplit: boolean
  enforceAppointments: boolean
  deferUneconomical: boolean
}

export const DEFAULT_PARAMS: PlanParams = {
  minLoadPct: 50,
  minDispatchValue: 150000,
  maxStops: 4,
  clusterRadiusKm: 140,
  maxCompanyKm: 700,
  preferCompany: true,
  allowSplit: true,
  enforceAppointments: true,
  deferUneconomical: true,
}

export interface AuditEntry {
  at: string
  action: string
  detail: string
}
