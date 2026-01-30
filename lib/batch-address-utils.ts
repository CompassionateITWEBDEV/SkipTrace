/**
 * Batch address skip-trace: flatten person details to one row (tutorial-style columns).
 */

import type { PersonDetailsResponse } from "./skip-trace-client"

export const BATCH_ADDRESS_CSV_COLUMNS = [
  "Search Street",
  "Search CityStateZip",
  "Person ID",
  "First Name",
  "Last Name",
  "Age",
  "Lives in",
  "Street Address",
  "Address Locality",
  "Address Region",
  "Postal Code",
  "Country Name",
  "Email 1",
  "Email 2",
  "Email 3",
  "Email 4",
  "Email 5",
  "Phone 1",
  "Phone 2",
  "Phone 3",
  "Phone 4",
  "Phone 5",
  "Person Link",
] as const

export type BatchAddressRow = Record<(typeof BATCH_ADDRESS_CSV_COLUMNS)[number], string>

function str(val: unknown): string {
  if (val == null) return ""
  if (typeof val === "string") return val.trim()
  return String(val).trim()
}

/**
 * Map PersonDetailsResponse (and search context) to one flat row for CSV/table.
 * Uses tutorial column names: Search Street, Search CityStateZip, Person ID, First Name, Last Name, Age, Lives in,
 * Street Address, Address Locality, Address Region, Postal Code, Country Name, Email 1–5, Phone 1–5, Person Link.
 */
export function mapPersonDetailsToFlatRow(
  peo_id: string,
  details: PersonDetailsResponse,
  searchStreet: string,
  searchCityStateZip: string,
): BatchAddressRow {
  const personDetails = Array.isArray(details["Person Details"]) ? details["Person Details"][0] : undefined
  const person = (personDetails as Record<string, unknown> | undefined) ?? {}
  const personName = str(person.Person_name)
  const [first = "", ...lastParts] = personName.split(" ")
  const firstName = first
  const lastName = lastParts.join(" ").trim()
  const age = str(person.Age)
  const livesIn = str(person["Lives in"] ?? person.Born ?? person.Lives_in ?? "")

  const currentAddressList = details["Current Address Details List"]
  const currentAddress = Array.isArray(currentAddressList) ? (currentAddressList[0] as Record<string, unknown>) : undefined
  const addr = currentAddress ?? {}
  const streetAddress = str(addr.street_address ?? addr.streetAddress ?? "")
  const addressLocality = str(addr.address_locality ?? addr.addressLocality ?? "")
  const addressRegion = str(addr.address_region ?? addr.addressRegion ?? "")
  const postalCode = str(addr.postal_code ?? addr.postalCode ?? "")
  const countryName = str(addr.county ?? addr.county ?? "")

  const emails = Array.isArray(details["Email Addresses"]) ? details["Email Addresses"] : []
  const email1 = emails[0] ?? ""
  const email2 = emails[1] ?? ""
  const email3 = emails[2] ?? ""
  const email4 = emails[3] ?? ""
  const email5 = emails[4] ?? ""

  const phoneDetails = Array.isArray(details["All Phone Details"]) ? details["All Phone Details"] : []
  const phone = (i: number) => {
    const p = phoneDetails[i] as Record<string, unknown> | undefined
    return p ? str(p.phone_number) : ""
  }
  const phone1 = phone(0)
  const phone2 = phone(1)
  const phone3 = phone(2)
  const phone4 = phone(3)
  const phone5 = phone(4)

  const personLink = `https://www.truepeoplesearch.com/${peo_id}`

  return {
    "Search Street": searchStreet,
    "Search CityStateZip": searchCityStateZip,
    "Person ID": peo_id,
    "First Name": firstName,
    "Last Name": lastName,
    "Age": age,
    "Lives in": livesIn,
    "Street Address": streetAddress,
    "Address Locality": addressLocality,
    "Address Region": addressRegion,
    "Postal Code": postalCode,
    "Country Name": countryName,
    "Email 1": email1,
    "Email 2": email2,
    "Email 3": email3,
    "Email 4": email4,
    "Email 5": email5,
    "Phone 1": phone1,
    "Phone 2": phone2,
    "Phone 3": phone3,
    "Phone 4": phone4,
    "Phone 5": phone5,
    "Person Link": personLink,
  }
}
