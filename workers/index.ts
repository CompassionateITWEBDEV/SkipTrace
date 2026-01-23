// Main entry point for running all workers
// Run this file to start both batch and monitoring workers

import "./batch-processor"
import "./monitoring-processor"

console.log("All workers started")
console.log("Press Ctrl+C to stop")

// Keep process alive
process.on("SIGINT", () => {
  console.log("\nShutting down workers...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\nShutting down workers...")
  process.exit(0)
})
