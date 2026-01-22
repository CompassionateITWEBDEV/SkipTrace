import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react"

interface SocialPlatform {
  platform: string
  found: boolean
  url?: string
  username?: string
}

interface EmailSocialResults {
  email: string
  platforms: SocialPlatform[]
  totalFound: number
  dataBreaches?: {
    found: boolean
    count?: number
  }
}

export function EmailSocialResults({ data }: { data: EmailSocialResults }) {
  const foundPlatforms = data.platforms.filter((p) => p.found)
  const notFoundPlatforms = data.platforms.filter((p) => !p.found)

  return (
    <div className="mt-6 space-y-4">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Email Social Media Report</CardTitle>
            <Badge variant={data.totalFound > 0 ? "default" : "secondary"} className="text-sm">
              {data.totalFound} Platforms Found
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{data.email}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {foundPlatforms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Found on {foundPlatforms.length} Platform{foundPlatforms.length !== 1 ? "s" : ""}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {foundPlatforms.map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{platform.platform}</span>
                      {platform.username && <span className="text-xs text-muted-foreground">@{platform.username}</span>}
                    </div>
                    {platform.url && (
                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {notFoundPlatforms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Not Found on {notFoundPlatforms.length} Platform{notFoundPlatforms.length !== 1 ? "s" : ""}
              </h3>
              <div className="flex flex-wrap gap-2">
                {notFoundPlatforms.map((platform) => (
                  <Badge key={platform.platform} variant="outline" className="text-xs">
                    {platform.platform}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.dataBreaches && data.dataBreaches.found && (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <h3 className="text-sm font-semibold text-destructive mb-2">Data Breach Alert</h3>
              <p className="text-sm text-muted-foreground">
                This email has been found in {data.dataBreaches.count} data breach
                {data.dataBreaches.count !== 1 ? "es" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
