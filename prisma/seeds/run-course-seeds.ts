import { seedDisputeResolutionCourse } from "./dispute-resolution-ap"
import { seedEarlyPaymentDiscountsCourse } from "./early-payment-discounts-ap"

async function main() {
  console.log("Seeding Dispute Resolution AP course...")
  await seedDisputeResolutionCourse()

  console.log("Seeding Early Payment Discounts AP course...")
  await seedEarlyPaymentDiscountsCourse()

  console.log("Done!")
}

main().catch(console.error)
