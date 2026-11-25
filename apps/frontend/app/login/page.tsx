import { redirect } from "next/navigation"

/*
  No sign-in or sign-up is offered while the hub runs as a free, open site, so
  the old login page sends visitors to the championship instead. The auth form
  component is untouched for when accounts return; restore this page from git
  history to bring it back.
*/
export default function LoginPage() {
  redirect("/wcc")
}
