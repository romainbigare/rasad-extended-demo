export const loginPath = "/login";
export const registerPath = "/register";
const mobileDashboardPage = "mobiledashboard";
const liteDashboardPage = "litedashboard";
export const forgotPasswordPath = "/forgot-password";
export const termsAndPolicyPath = "/terms-and-policy";

export const authRoutes = [
  loginPath,
  registerPath,
  forgotPasswordPath,
  termsAndPolicyPath,
];
export const otherPage = [
  mobileDashboardPage,
  liteDashboardPage,
];
export function isAnyAuthPage(currPath: string) {
  return authRoutes
    .map((route) => (currPath.includes(route) ? true : false))
    .includes(true);
}

export function isOtherPage(currPath: string) {
  return otherPage
    .map((route) => (currPath.includes(route) ? true : false))
    .includes(true);
}
