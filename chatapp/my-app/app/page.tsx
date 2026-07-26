// ============================================================================
// Root Page - Redirect to Dashboard or Login
// ============================================================================

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/conversations");
}

