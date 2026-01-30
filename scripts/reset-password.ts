/**
 * Reset a user's password by email (dev/testing only).
 * Passwords in the DB are hashed with bcrypt — they cannot be "seen" or recovered.
 * Use this script to set a new password for a test account.
 *
 * Usage: pnpm run reset-password <email> <new-password>
 * Example: pnpm run reset-password test@example.com MyNewPassword123
 */

import "dotenv/config"
import { hash } from "bcryptjs"
import { db } from "../lib/db"

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error("Usage: pnpm run reset-password <email> <new-password>")
    console.error("Example: pnpm run reset-password test@example.com MyNewPassword123")
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters (same as signup requirement).")
    process.exit(1)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const passwordHash = await hash(newPassword, 12)
  await db.user.update({
    where: { email },
    data: { passwordHash },
  })

  console.log(`Password updated for ${email}. You can now sign in with the new password.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
