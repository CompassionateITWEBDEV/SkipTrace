import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, ArrowLeft, Mail, Phone, MapPin, Briefcase, Globe } from "lucide-react"
import Link from "next/link"

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  // Mock data - in production this would fetch from your database
  const report = {
    id: params.id,
    query: "john.doe@example.com",
    type: "email",
    date: "2024-01-20",
    results: {
      names: ["John Doe", "Jonathan Doe"],
      emails: ["john.doe@example.com", "j.doe@company.com", "johndoe@gmail.com"],
      phones: ["+1 (555) 123-4567", "+1 (555) 987-6543"],
      addresses: [
        "123 Main Street, New York, NY 10001",
        "456 Oak Avenue, Brooklyn, NY 11201",
      ],
      employment: [
        { company: "Tech Corp", title: "Senior Developer", years: "2020-Present" },
        { company: "StartupXYZ", title: "Developer", years: "2018-2020" },
      ],
      socialMedia: [
        { platform: "LinkedIn", url: "linkedin.com/in/johndoe", found: true },
        { platform: "Twitter", url: "twitter.com/johndoe", found: true },
        { platform: "Facebook", url: "facebook.com/john.doe", found: true },
        { platform: "GitHub", url: "github.com/johndoe", found: true },
      ],
    },
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Report</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Badge variant="secondary" className="capitalize">
              {report.type} Search
            </Badge>
            <span>{report.date}</span>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Query</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-mono">{report.query}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Addresses
              </CardTitle>
              <CardDescription>Found {report.results.emails.length} email addresses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.results.emails.map((email, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-mono text-sm">{email}</span>
                    <Badge variant="outline">Verified</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Numbers
              </CardTitle>
              <CardDescription>Found {report.results.phones.length} phone numbers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.results.phones.map((phone, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-mono text-sm">{phone}</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
              <CardDescription>Found {report.results.addresses.length} addresses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.results.addresses.map((address, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">{address}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.results.employment.map((job, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <div className="font-semibold">{job.title}</div>
                    <div className="text-sm text-muted-foreground">{job.company}</div>
                    <div className="text-xs text-muted-foreground mt-1">{job.years}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Presence
              </CardTitle>
              <CardDescription>
                Found on {report.results.socialMedia.filter((s) => s.found).length} platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.results.socialMedia.map((social, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="font-semibold text-sm">{social.platform}</div>
                      <div className="text-xs text-muted-foreground">{social.url}</div>
                    </div>
                    {social.found && (
                      <Badge variant="default" className="text-xs">
                        Found
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
