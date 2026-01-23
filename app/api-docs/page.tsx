import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code } from "lucide-react"
import { DownloadOpenApiButton } from "@/components/download-openapi-button"

export const metadata = {
  title: "API Documentation - SkipTrace Pro",
  description: "Integrate skip tracing into your applications",
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground">
            Integrate powerful skip tracing capabilities into your applications
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Authenticate and make your first request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  All API requests require an API key. Include it in the Authorization header as a Bearer token, or use the x-api-key header.
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`curl -X POST "https://api.skiptracepro.com/v1/search/email" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "example@email.com"}'`}</code>
                </pre>
                <p className="text-sm text-muted-foreground mt-3">
                  <strong>Alternative:</strong> Use the x-api-key header instead:
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto mt-2">
                  <code className="text-sm">{`curl -X POST "https://api.skiptracepro.com/v1/search/email" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "example@email.com"}'`}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  All API requests should be made to:
                </p>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {process.env.NEXT_PUBLIC_BASE_URL || "https://api.skiptracepro.com"}/v1/
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Response Headers</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  All responses include the following headers:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li><code>X-API-Version</code> - API version (currently v1)</li>
                  <li><code>X-RateLimit-Remaining</code> - Remaining requests in your quota</li>
                  <li><code>X-RateLimit-Reset</code> - Unix timestamp when rate limit resets</li>
                  <li><code>X-Request-ID</code> - Unique request identifier for support</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Email Search Endpoint
              </CardTitle>
              <CardDescription>POST /v1/search/email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "email": "john.doe@example.com",
  "phone": 1
}`}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Response</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "success": true,
  "data": {
    "names": ["John Doe"],
    "emails": ["john.doe@example.com"],
    "phones": ["+1234567890"],
    "addresses": ["123 Main St"],
    "social_media": {...}
  }
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Phone Search Endpoint
              </CardTitle>
              <CardDescription>POST /v1/search/phone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "phone": "+1234567890"
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Name Search Endpoint
              </CardTitle>
              <CardDescription>POST /v1/search/name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "firstName": "John",
  "lastName": "Doe",
  "city": "New York",
  "state": "NY"
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Search Endpoint</CardTitle>
              <CardDescription>POST /v1/search/comprehensive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Provide any combination of email, phone, name, or address:
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "name": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY"
  }
}`}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Response</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Returns correlated data with confidence score:
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`{
  "correlatedData": {...},
  "confidenceScore": 85,
  "dataQuality": "high",
  "summary": "High confidence match. Found 2 names, 1 email, 1 phone, 2 addresses...",
  "insights": ["Complete profile with name, email, phone, and address information"]
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Codes</CardTitle>
              <CardDescription>Common error responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">401 Unauthorized</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`{
  "error": "Invalid API key",
  "message": "The provided API key is not valid..."
}`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">429 Too Many Requests</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "remaining": 0
}`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">400 Bad Request</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`{
  "error": "Valid email is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email"
  }
}`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">500 Internal Server Error</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`{
  "error": "Failed to perform skip trace",
  "code": "INTERNAL_ERROR"
}`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>Plan-based rate limiting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Free Plan</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>50 searches per month</li>
                    <li>5 searches per day</li>
                    <li>Batch size limit: 10 items</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Starter Plan</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>500 searches per month</li>
                    <li>50 searches per day</li>
                    <li>Batch size limit: 100 items</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Professional Plan</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>5,000 searches per month</li>
                    <li>500 searches per day</li>
                    <li>Batch size limit: 1,000 items</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Enterprise Plan</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li>100,000 searches per month</li>
                    <li>10,000 searches per day</li>
                    <li>Batch size limit: 10,000 items</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> Rate limit information is included in response headers. Check <code>X-RateLimit-Remaining</code> to monitor your usage.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OpenAPI Specification</CardTitle>
              <CardDescription>Download the complete API specification in OpenAPI 3.0 format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The SkipTrace API is fully documented using OpenAPI 3.0. Download the specification to generate client SDKs, view interactive documentation, or integrate with API testing tools.
                </p>
                <div className="flex gap-2">
                  <DownloadOpenApiButton />
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>SDK Generation:</strong> Use tools like OpenAPI Generator or Swagger Codegen to generate client libraries in Python, JavaScript, Go, Java, and more from the OpenAPI specification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Receive notifications for async operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Webhooks allow you to receive real-time notifications when batch jobs complete or monitoring alerts are triggered. Configure webhook URLs in your account settings.
                </p>
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Webhook Events</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li><code>batch.completed</code> - Fired when a batch search job completes</li>
                    <li><code>monitoring.alert</code> - Fired when monitoring detects changes</li>
                    <li><code>report.ready</code> - Fired when a scheduled report is generated</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Webhook Payload</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`{
  "event": "batch.completed",
  "timestamp": "2026-01-23T12:00:00Z",
  "data": {
    "jobId": "job_123",
    "status": "completed",
    "summary": {
      "total": 100,
      "success": 95,
      "errors": 5
    }
  }
}`}</code>
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Webhook endpoints must respond with 200 OK within 5 seconds. Failed deliveries will be retried up to 3 times.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
