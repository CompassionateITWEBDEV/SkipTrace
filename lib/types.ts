// Type definitions for the application

export interface ApiResponse {
  success?: boolean
  data?: unknown
  error?: string
  [key: string]: unknown
}

export interface SkipTraceData {
  person?: {
    names?: string[] | Array<{ display?: string; full?: string; first?: string; last?: string }>
    phones?: string[] | Array<{ number?: string; display?: string; type?: string }>
    addresses?: string[] | Array<{ display?: string; street?: string; city?: string; state?: string; zip?: string; type?: string }>
    emails?: string[] | Array<{ address?: string; email?: string }>
    jobs?: Array<{ title?: string; position?: string; company?: string; organization?: string }>
    education?: unknown[]
    social_profiles?: unknown[]
    socialProfiles?: unknown[]
  }
  data?: {
    person?: SkipTraceData['person']
  }
  [key: string]: unknown
}

export interface SocialMediaData {
  [platform: string]: {
    registered?: boolean
    username?: string
    url?: string
  } | boolean
}

export interface PhoneValidationData {
  is_virtual?: boolean
  isVirtual?: boolean
  is_disposable?: boolean
  isDisposable?: boolean
  carrier?: string
  line_type?: string
  lineType?: string
  risk_score?: number
  riskScore?: number
  country?: string
  country_code?: string
  countryCode?: string
  last_seen?: string
  lastSeen?: string
  [key: string]: unknown
}

export interface EnrichmentResult {
  inputData: {
    email?: string
    phone?: string
    name?: string
    address?: string
  }
  skipTraceData?: SkipTraceData | null
  socialMediaData?: SocialMediaData | null
  phoneValidation?: PhoneValidationData | null
  nameSearchData?: SkipTraceData | null
  confidenceScore: number
  dataPoints: number
  dataQuality?: "high" | "medium" | "low"
  enrichedAt: string
}

export interface BatchSearchResult {
  input: string
  type: "email" | "name" | "phone" | "unknown"
  status: "pending" | "processing" | "success" | "error" | "not_found"
  matches?: number
  results?: unknown
  error?: string
}

export interface PersonData {
  names?: string[]
  emails?: string[]
  phones?: string[]
  addresses?: string[]
  socialMedia?: Record<string, unknown>
  employmentHistory?: unknown[]
  dataBreaches?: unknown[]
}

export interface SearchResult {
  skipTrace?: SkipTraceData
  socialMedia?: SocialMediaData
  email?: string
  searchedAt?: string
}
