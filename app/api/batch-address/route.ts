import { type NextRequest, NextResponse } from "next/server"
import { getConfig } from "@/lib/config"
import { createErrorResponse, ValidationError } from "@/lib/error-handler"
import { searchByAddress, getPersonDetails, buildCityStateZip } from "@/lib/skip-trace-client"
import type { SkipTraceSearchResponse } from "@/lib/skip-trace-client"
import { mapPersonDetailsToFlatRow, type BatchAddressRow } from "@/lib/batch-address-utils"

const MAX_ADDRESSES_PER_BATCH = 20

export interface BatchAddressInput {
  street: string
  citystatezip?: string
  city?: string
  state?: string
  zip?: string
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getConfig().rapidApiKey
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const { addresses: rawAddresses } = body as { addresses?: BatchAddressInput[] }

    if (!rawAddresses || !Array.isArray(rawAddresses)) {
      throw new ValidationError("addresses array is required", "addresses")
    }

    const addresses: Array<{ street: string; citystatezip: string }> = []
    for (let i = 0; i < rawAddresses.length; i++) {
      const a = rawAddresses[i]
      if (!a || typeof a !== "object") continue
      const street = typeof a.street === "string" ? a.street.trim() : ""
      if (!street) continue
      const citystatezip =
        typeof a.citystatezip === "string" && a.citystatezip.trim()
          ? a.citystatezip.trim()
          : buildCityStateZip(a.city, a.state, a.zip)
      addresses.push({ street, citystatezip: citystatezip || street })
    }

    if (addresses.length === 0) {
      throw new ValidationError("At least one valid address (street required) is required", "addresses")
    }

    if (addresses.length > MAX_ADDRESSES_PER_BATCH) {
      throw new ValidationError(
        `Maximum ${MAX_ADDRESSES_PER_BATCH} addresses per batch. Got ${addresses.length}.`,
        "addresses",
      )
    }

    const rows: BatchAddressRow[] = []
    let requestsUsed = 0

    for (const { street, citystatezip } of addresses) {
      let searchResult: SkipTraceSearchResponse
      try {
        searchResult = await searchByAddress(street, citystatezip, "1")
        requestsUsed += 1
      } catch (err) {
        console.warn(`Batch address: searchByAddress failed for ${street} ${citystatezip}:`, err)
        continue
      }

      const people = searchResult.PeopleDetails ?? []
      for (const person of people) {
        const peoId = person["Person ID"] ?? person.Person_ID
        if (typeof peoId !== "string" || !peoId.trim()) continue

        try {
          const details = await getPersonDetails(peoId.trim())
          requestsUsed += 1
          const row = mapPersonDetailsToFlatRow(peoId.trim(), details, street, citystatezip)
          rows.push(row)
        } catch (err) {
          console.warn(`Batch address: getPersonDetails failed for ${peoId}:`, err)
        }
      }
    }

    const summary = {
      totalAddresses: addresses.length,
      totalPeople: rows.length,
      requestsUsed,
    }

    return NextResponse.json({
      success: true,
      summary,
      rows,
    })
  } catch (error) {
    console.error("Batch address error:", error)
    return createErrorResponse(error, "Failed to process batch address")
  }
}
