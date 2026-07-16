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
}

const ATM_CATEGORY = "700-7000-0117"
const BANK_CATEGORY = "700-7000-0115"

export { ATM_CATEGORY, BANK_CATEGORY }
