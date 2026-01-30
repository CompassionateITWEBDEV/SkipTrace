/**
 * Delete a user account and all related records (dev/testing only).
 * Use this to remove an account so you can re-create it (e.g. after a forced password change).
 *
 * Usage: pnpm run delete-account <email>
 * Example: pnpm run delete-account test@example.com
 */

import "dotenv/config"
import { db } from "../lib/db"

async function main() {
  const email = process.argv[2]

  if (!email || !email.includes("@")) {
    console.error("Usage: pnpm run delete-account <email>")
    console.error("Example: pnpm run delete-account test@example.com")
    process.exit(1)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const userId = user.id

  // Relations without onDelete Cascade: clear userId so we can delete the user
  await db.searchLog.updateMany({ where: { userId }, data: { userId: null } })
  await db.batchJob.updateMany({ where: { userId }, data: { userId: null } })

  // Delete user (cascade deletes ApiKey, SavedSearch, Report, MonitoringSubscription, Notification)
  await db.user.delete({ where: { id: userId } })

  console.log(`Account and all related records deleted for ${email}. You can sign up again with this email.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
