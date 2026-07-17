export type HereMapsConfig = {
  apiKey: string
  baseUrl: string
}

export type HereMapsPosition = {
  lat: number
  lng: number
}

export type HereMapsCategory = {
  id: string
  name: string
  primary?: boolean
}

export type HereMapsAddress = {
  label: string
  countryCode?: string
  countryName?: string
  county?: string
  city?: string
  district?: string
  street?: string
  postalCode?: string
  houseNumber?: string
}

export type HereMapsOpeningHour = {
  categories: { id: string }[]
  text: string[]
  isOpen: boolean
  structured: { start: string; duration: string; recurrence: string }[]
}

export type HereMapsContact = {
  phone?: { value: string }[]
  www?: { value: string }[]
  email?: { value: string }[]
}

export type HereMapsPlace = {
  title: string
  id: string
  resultType: string
  position: HereMapsPosition
  address: HereMapsAddress
  categories: HereMapsCategory[]
  contacts?: HereMapsContact[]
  openingHours?: HereMapsOpeningHour[]
  distance?: number
  icon?: string
}

export type HereMapsBrowseResponse = {
  items: HereMapsPlace[]
  offset?: number
  nextOffset?: number
  count?: number
  limit?: number
}

const ATM_CATEGORY = "700-7010-0108"
const BANK_CATEGORY = "700-7000-0107"
const MONEY_TRANSFER_CATEGORY = "700-7050-0109"

export type HereMapsRoutingResponse = {
  routes: {
    id: string
    sections: {
      id: string
      type: string
      transportMode: string
      polyline: string
      summary: {
        duration: number
        length: number
        baseDuration?: number
      }
      departure: {
        time: string
        place: { location: { lat: number; lng: number } }
      }
      arrival: {
        time: string
        place: { location: { lat: number; lng: number } }
      }
    }[]
  }[]
}

export type HereMapsLookupResponse = HereMapsPlace

export { ATM_CATEGORY, BANK_CATEGORY, MONEY_TRANSFER_CATEGORY }
