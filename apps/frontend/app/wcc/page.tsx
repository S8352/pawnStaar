import { redirect } from "next/navigation"

import { WCC_YEAR } from "@/lib/wcc/config"
import { yearHref } from "@/lib/wcc/routes"

/*
  `/wcc` is the name people will type and link; the year is the canonical shape
  so that a second championship does not have to displace the first.
*/

export default function WccIndexPage(): never {
  redirect(yearHref(WCC_YEAR))
}
