/** Demo build: there is no sign-in, so there is nothing to sign out of - just go back to the start. */
export function logout(redirect: boolean = true, _url?: string) {
  if (redirect) window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/executive-view`;
}
