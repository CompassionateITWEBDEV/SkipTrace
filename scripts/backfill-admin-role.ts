/**
 * One-time script to set role = ADMIN for users whose email is in ADMIN_EMAILS.
 * Run after applying the add_role_and_stripe_customer_id migration:
 *   pnpm run backfill-admin-role
 */
import { db } from "../lib/db"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean)

async function main() {
  if (ADMIN_EMAILS.length === 0) {
    console.log("ADMIN_EMAILS not set or empty; nothing to backfill.")
    return
  }

  const result = await db.user.updateMany({
    where: { email: { in: ADMIN_EMAILS } },
    data: { role: "ADMIN" },
  })
  console.log(`Updated ${result.count} user(s) to ADMIN role (emails in ADMIN_EMAILS).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
