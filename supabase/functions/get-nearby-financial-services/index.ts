/* global Deno */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { rankApiLocations, toApiLocation } from "../_shared/financial-location.ts"
import type { FinancialServiceRecord, FinancialServiceType } from "../_shared/financial-location.ts"

type HereCategory = { id: string; name: string; primary?: boolean }
type HerePlace = {
  id: string
  title: string
  icon?: string
  resultType?: string
  categories?: HereCategory[]
  address?: { label?: string }
  position: { lat: number; lng: number }
  distance?: number
  openingHours?: { text?: string[]; isOpen?: boolean | null }[]
  contacts?: { phone?: { value: string }[]; www?: { value: string }[]; email?: { value: string }[] }[]
}

const ATM_CATEGORY = "700-7010-0108"
const BANK_CATEGORY = "700-7000-0107"
const MONEY_TRANSFER_CATEGORY = "700-7050-0109"
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_RADIUS = 10000
const HERE_BROWSE_URL = "https://browse.search.hereapi.com/v1/browse"

const providerMatchers: Record<string, "Fawry" | "Bee" | "Aman" | "Masary" | "Dafaa"> = {
  fawry: "Fawry",
  bee: "Bee",
  aman: "Aman",
  masary: "Masary",
  dafaa: "Dafaa",
}

function assertNumber(value: unknown, name: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name.toUpperCase()}_INVALID`)
  }
  return value
}

function clampInt(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.round(value), max))
}

function normalizeServiceTypes(value: unknown): FinancialServiceType[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is FinancialServiceType => typeof item === "string")
}

function detectProvider(title: string) {
  const lower = title.toLowerCase()
  for (const [needle, provider] of Object.entries(providerMatchers)) {
    if (lower.includes(needle)) return provider
  }
  return null
}

function primaryCategory(categories: HereCategory[]) {
  return categories.find((category) => category.primary) ?? categories[0] ?? null
}

function inferLocationType(categories: HereCategory[], title: string) {
  const ids = categories.map((category) => category.id)
  const lowerTitle = title.toLowerCase()
  if (ids.some((id) => id === ATM_CATEGORY || id.startsWith("700-7010-")) || lowerTitle.includes("atm")) return "ATM"
  if (ids.some((id) => id === BANK_CATEGORY || id.startsWith("700-7000-")) || lowerTitle.includes("bank")) return "Bank"
  return "Financial Service Provider"
}

function inferServiceTypes(place: HerePlace, provider: ReturnType<typeof detectProvider>) {
  const title = place.title.toLowerCase()
  const categories = place.categories ?? []
  const ids = categories.map((category) => category.id)
  const names = categories.map((category) => category.name.toLowerCase())
  const result = new Set<FinancialServiceType>()

  if (ids.some((id) => id === ATM_CATEGORY || id.startsWith("700-7010-")) || title.includes("atm") || names.some((name) => name.includes("atm"))) {
    result.add("ATM")
  }
  if (ids.some((id) => id === BANK_CATEGORY || id.startsWith("700-7000-")) || title.includes("branch") || names.some((name) => name.includes("bank") || name.includes("branch"))) {
    result.add("Bank Branch")
  }
  if (title.includes("deposit") || title.includes("cdm") || names.some((name) => name.includes("deposit"))) {
    result.add("Cash Deposit Machine")
  }
  if (provider) result.add(provider)
  if (result.size === 0 && ids.some((id) => id === MONEY_TRANSFER_CATEGORY || id.startsWith("700-7050-"))) {
    result.add("Other Financial Service Provider")
  }
  if (result.size === 0) result.add("Other Financial Service Provider")

  return [...result]
}

function primaryServiceType(locationType: string, serviceTypes: FinancialServiceType[]) {
  if (locationType === "ATM" && serviceTypes.includes("ATM")) return "ATM"
  if (locationType === "Bank" && serviceTypes.includes("Bank Branch")) return "Bank Branch"
  return serviceTypes[0] ?? "Other Financial Service Provider"
}

function firstContact(place: HerePlace, key: "phone" | "www" | "email") {
  return place.contacts?.flatMap((contact) => contact[key] ?? [])[0]?.value ?? null
}

function normalizeHerePlace(place: HerePlace) {
  const categories = place.categories ?? []
  const provider = detectProvider(place.title)
  const locationType = inferLocationType(categories, place.title)
  const serviceTypes = inferServiceTypes(place, provider)
  const category = primaryCategory(categories)

  return {
    external_provider: "here",
    external_id: place.id,
    name: place.title,
    logo: place.icon ?? null,
    location_type: locationType,
    category_id: category?.id ?? null,
    category_name: category?.name ?? null,
    provider,
    service_types: serviceTypes,
    primary_service_type: primaryServiceType(locationType, serviceTypes),
    address: place.address?.label ?? place.title,
    latitude: place.position.lat,
    longitude: place.position.lng,
    is_open: place.openingHours?.some((hours) => hours.isOpen) ?? null,
    phone: firstContact(place, "phone"),
    website: firstContact(place, "www"),
    email: firstContact(place, "email"),
    opening_hours: place.openingHours
      ? place.openingHours.map((hours) => ({ text: hours.text ?? [], isOpen: hours.isOpen ?? null }))
      : null,
  }
}

function categoriesFor(types: FinancialServiceType[]) {
  if (types.length === 0) return [ATM_CATEGORY, BANK_CATEGORY, MONEY_TRANSFER_CATEGORY]
  const categories = new Set<string>()
  if (types.includes("ATM")) categories.add(ATM_CATEGORY)
  if (types.includes("Bank Branch") || types.includes("Cash Deposit Machine")) categories.add(BANK_CATEGORY)
  if (types.some((type) => ["Fawry", "Aman", "Masary", "Bee", "Dafaa", "Other Financial Service Provider"].includes(type))) {
    categories.add(MONEY_TRANSFER_CATEGORY)
  }
  return [...categories]
}

async function fetchHere(params: {
  latitude: number
  longitude: number
  radius: number
  limit: number
  offset: number
  query: string
  serviceTypes: FinancialServiceType[]
}) {
  const apiKey = Deno.env.get("HERE_API_KEY")
  if (!apiKey) throw new Error("HERE_API_KEY_MISSING")

  const requests = categoriesFor(params.serviceTypes).map(async (category) => {
    const url = new URL(HERE_BROWSE_URL)
    url.searchParams.set("apiKey", apiKey)
    url.searchParams.set("at", `${params.latitude},${params.longitude}`)
    url.searchParams.set("in", `circle:${params.latitude},${params.longitude};r=${params.radius}`)
    url.searchParams.set("categories", category)
    url.searchParams.set("limit", String(params.limit))
    url.searchParams.set("offset", String(params.offset))
    url.searchParams.set("lang", "en")
    if (params.query.trim()) url.searchParams.set("q", params.query.trim())

    const response = await fetch(url)
    if (!response.ok) throw new Error(`HERE_FAILED_${response.status}`)
    const body = await response.json()
    return (body.items ?? []) as HerePlace[]
  })

  const pages = await Promise.all(requests)
  return [...new Map(pages.flat().map((place) => [place.id, place])).values()]
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405)

  try {
    const body = await request.json()
    const latitude = assertNumber(body.latitude, "latitude")
    const longitude = assertNumber(body.longitude, "longitude")
    const radius = Math.min(clampInt(body.radius, 2000, MAX_RADIUS), MAX_RADIUS)
    const limit = clampInt(body.limit, DEFAULT_LIMIT, MAX_LIMIT)
    const offset = clampInt(body.offset ?? 0, 0, 1000)
    const query = typeof body.query === "string" ? body.query : ""
    const serviceTypes = normalizeServiceTypes(body.service_types ?? body.serviceTypes)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    let freshness = { source: "here", isStale: false, syncedAt: new Date().toISOString() }
    let records: FinancialServiceRecord[] = []

    try {
      const herePlaces = await fetchHere({ latitude, longitude, radius, limit, offset, query, serviceTypes })
      const payload = herePlaces.map(normalizeHerePlace)
      if (payload.length > 0) {
        const { data, error } = await supabase.rpc("sync_financial_services_from_provider", { payload })
        if (error) throw error
        records = data as FinancialServiceRecord[]
      }
    } catch (error) {
      freshness = { source: "cache", isStale: true, syncedAt: new Date().toISOString() }
      const { data, error: cacheError } = await supabase
        .from("financial_services")
        .select("*")
        .eq("is_active", true)
        .order("synced_at", { ascending: false })
        .limit(limit * 4)

      if (cacheError) throw cacheError
      records = (data ?? []) as FinancialServiceRecord[]
      console.error("HERE fallback used", error)
    }

    const apiItems = records
      .map((record) => toApiLocation(record, { latitude, longitude }))
      .filter((item) => item.distanceFromUser <= radius)
      .filter((item) => serviceTypes.length === 0 || item.serviceTypes.some((type) => serviceTypes.includes(type)))
      .filter((item) => !query || `${item.name} ${item.address}`.toLowerCase().includes(query.toLowerCase()))

    const items = rankApiLocations(apiItems).slice(0, limit)
    return jsonResponse({ items, nextOffset: items.length === limit ? offset + limit : null, freshness })
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR"
    return jsonResponse({ error: message }, 400)
  }
})
