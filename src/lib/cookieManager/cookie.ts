import { MayBe } from "lib/types";

export function getCookieValue(cookieName: string): MayBe<string> {
  // Split the cookie string into an array of individual cookies
  const cookies: string[] = document.cookie.split(";");

  // Iterate through the cookies to find the one with the specified name
  for (let i = 0; i < cookies.length; i++) {
    const cookie: string = cookies[i].trim(); // Remove leading and trailing spaces
    // Check if this cookie has the desired name
    if (cookie.indexOf(`${cookieName}=`) === 0) {
      // Return the cookie value (substring after the '=' sign)
      return cookie.substring(cookieName.length + 1);
    }
  }

  // If the cookie with the specified name is not found, return null
  return null;
}

export function setCookie(
  cookieName: string,
  cookieValue: string,
  expirationDays: number,
) {
  const date = new Date();
  date.setTime(date.getTime() + expirationDays * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${cookieName}=${cookieValue};${expires};path=/`;
}

export function clearCookies() {
  const cookies: string[] = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie: string = cookies[i];
    const eqPos: number = cookie.indexOf("=");
    const name: string = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
  }
}
