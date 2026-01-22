import { Card, CardContent } from "@/components/ui/card"

const platforms = [
  ["Apple", "Ebay", "Facebook", "Flickr", "Foursquare", "Github"],
  ["Google", "Gravatar", "Instagram", "Lastfm", "LinkedIn", "Microsoft"],
  ["Myspace", "Pinterest", "Skype", "Spotify", "Tumblr", "Twitter"],
  ["Vimeo", "Weibo", "Yahoo", "Discord", "Kakao", "Booking"],
  ["Airbnb", "Amazon", "Qzone", "Adobe", "Mailru", "Wordpress"],
  ["Imgur", "Disney+", "Netflix", "Flipkart", "Bukalapak", "Archive.org"],
  ["Lazada", "Zoho", "Samsung", "Evernote", "Envato", "Patreon"],
  ["Tokopedia", "Rambler", "Quora", "Atlassian", "TikTok", "Snapchat"],
]

export function PlatformGrid() {
  return (
    <section className="border-t border-border bg-muted/20 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">48+ Platform Integration</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comprehensive email verification across all major social networks and services
          </p>
        </div>

        <Card className="border-2">
          <CardContent className="p-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {platforms.flat().map((platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5"
                >
                  {platform}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Plus continuous integration with emerging platforms and data sources
          </p>
        </div>
      </div>
    </section>
  )
}
