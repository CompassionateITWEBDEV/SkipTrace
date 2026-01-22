import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Shield, Phone, MapPin, Wifi } from "lucide-react"

interface PhoneValidationData {
  phoneNumber: string
  isValid: boolean
  isVirtual: boolean
  isDisposable: boolean
  riskScore: number
  carrier: string
  lineType: string
  country: string
  warnings: string[]
  lastSeen: string | null
}

export function PhoneValidationResult({ data }: { data: PhoneValidationData }) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return "destructive"
    if (score >= 40) return "secondary"
    return "default"
  }

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk"
    if (score >= 40) return "Medium Risk"
    return "Low Risk"
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{data.phoneNumber}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {data.isVirtual && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Virtual Number
                </Badge>
              )}
              {data.isDisposable && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Disposable
                </Badge>
              )}
              {data.isValid && !data.isVirtual && (
                <Badge variant="default" className="gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Valid
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{data.riskScore}%</div>
            <Badge variant={getRiskColor(data.riskScore)}>{getRiskLabel(data.riskScore)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Carrier</div>
              <div className="font-semibold">{data.carrier}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Line Type</div>
              <div className="font-semibold">{data.lineType}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Country</div>
              <div className="font-semibold">{data.country}</div>
            </div>
          </div>
        </div>

        {data.warnings.length > 0 && (
          <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-semibold text-destructive">Security Warnings</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.warnings.map((warning, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-destructive">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {data.lastSeen && (
          <div className="text-sm text-muted-foreground">
            Last seen in virtual number database: {new Date(data.lastSeen).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
