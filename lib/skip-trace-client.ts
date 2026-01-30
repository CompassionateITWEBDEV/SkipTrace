/**
 * Shared Skip Tracing Working API client (RapidAPI).
 * Single place for all skip-trace API calls; uses official parameter names.
 */

import axios, { type AxiosInstance, type AxiosResponse } from "axios"
import { getConfig } from "./config"

const BASE_URL = "https://skip-tracing-working-api.p.rapidapi.com"
const HOST = "skip-tracing-working-api.p.rapidapi.com"
const DEFAULT_TIMEOUT_MS = 30_000

function createClient(): AxiosInstance {
  const config = getConfig()
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      "x-rapidapi-host": HOST,
      "x-rapidapi-key": config.rapidApiKey,
    },
  })

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const remaining = response.headers["x-ratelimit-requests-remaining"]
      const reset = response.headers["x-ratelimit-requests-reset"]
      if (remaining !== undefined || reset !== undefined) {
        // Optional: log or expose for admin/UI
        if (process.env.NODE_ENV === "development") {
          console.debug("[SkipTrace] rate limit", { remaining, reset })
        }
      }
      return response
    },
    (error) => Promise.reject(error),
  )

  return instance
}

let clientInstance: AxiosInstance | null = null

function getClient(): AxiosInstance {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}

export interface SkipTraceSearchResponse {
  Status?: number
  Message?: string
  Source?: string
  Records?: number
  Page?: number
  PeopleDetails?: Array<{
    Name?: string
    Link?: string
    "Person ID"?: string
    Age?: string | number
    "Lives in"?: string
    "Used to live in"?: string
    "Related to"?: string
    [key: string]: unknown
  }>
  PropertyDetails?: unknown
  [key: string]: unknown
}

/**
 * Search by email. Params: email, phone=1, page.
 */
export async function searchByEmail(
  email: string,
  page = "1",
): Promise<SkipTraceSearchResponse> {
  const { data } = await getClient().get<SkipTraceSearchResponse>("/search/byemail", {
    params: { email, phone: "1", page },
  })
  return data
}

/**
 * Search by phone. Params: phoneno, page.
 */
export async function searchByPhone(
  phoneno: string,
  page = "1",
): Promise<SkipTraceSearchResponse> {
  const { data } = await getClient().get<SkipTraceSearchResponse>("/search/byphone", {
    params: { phoneno, page },
  })
  return data
}

/**
 * Search by name. Params: name (full name), page.
 */
export async function searchByName(
  name: string,
  page = "1",
): Promise<SkipTraceSearchResponse> {
  const { data } = await getClient().get<SkipTraceSearchResponse>("/search/byname", {
    params: { name, page },
  })
  return data
}

/**
 * Search by address. Params: street, citystatezip (e.g. "City, ST Zip"), page.
 */
export async function searchByAddress(
  street: string,
  citystatezip: string,
  page = "1",
): Promise<SkipTraceSearchResponse> {
  const { data } = await getClient().get<SkipTraceSearchResponse>("/search/byaddress", {
    params: { street, citystatezip, page },
  })
  return data
}

/**
 * Search by name and address. Params: name, citystatezip, page.
 */
export async function searchByNameAddress(
  name: string,
  citystatezip: string,
  page = "1",
): Promise<SkipTraceSearchResponse> {
  const { data } = await getClient().get<SkipTraceSearchResponse>(
    "/search/bynameaddress",
    {
      params: { name, citystatezip, page },
    },
  )
  return data
}

export interface PersonDetailsResponse {
  Status?: number
  Message?: string
  Source?: string
  "Person Details"?: Array<Record<string, unknown>>
  "Current Address Details List"?: Array<Record<string, unknown>>
  "All Phone Details"?: Array<Record<string, unknown>>
  "Email Addresses"?: string[]
  "Previous Address Details"?: Array<Record<string, unknown>>
  "All Relatives"?: Array<Record<string, unknown>>
  "All Associates"?: Array<Record<string, unknown>>
  [key: string]: unknown
}

/**
 * Get person details by ID. Params: peo_id.
 */
export async function getPersonDetails(peo_id: string): Promise<PersonDetailsResponse> {
  const { data } = await getClient().get<PersonDetailsResponse>("/search/detailsbyID", {
    params: { peo_id },
  })
  return data
}

/**
 * Lightweight health check (GET /health). Does not consume quota.
 * Returns true if the API is reachable; false or throw otherwise.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await getClient().get("/health", { timeout: 5000 })
    return res.status === 200
  } catch {
    return false
  }
}

/**
 * Build citystatezip from city, state, zip (e.g. "Irving, TX 75061").
 */
export function buildCityStateZip(
  city?: string,
  state?: string,
  zip?: string,
): string {
  const parts: string[] = []
  if (city?.trim()) parts.push(city.trim())
  if (state?.trim()) parts.push(state.trim())
  if (zip?.toString().trim()) parts.push(zip.toString().trim())
  return parts.join(", ").trim() || ""
}
