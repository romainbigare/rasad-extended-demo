export const ADAFSA_PRODUCT_NAME = "farm monitoring";

export const RBAC_ENDPOINTS = {
  SIGNUP: "/api/v1/auth/signup",
  LOGIN: "/api/v1/auth/login",
  REFRESH: "/api/v1/auth/refresh",
  LOGOUT: "/api/v1/auth/logout",
  ACTIVATE: "/api/v1/auth/activate",
  PASSWORD_RESET: "/api/v1/auth/password-reset",
  DELETE_ACCOUNT: "/api/v1/auth/delete-account",
  SEND_OTP_AUTH: "/api/v1/auth/send-otp",
  OTP_SEND: "/api/v1/otp/send",
  OTP_VERIFY: "/api/v1/otp/verify",
  PROFILE: "/api/v1/profile/",
  PROFILE_UPDATE: "/api/v1/profile/update",
  PROFILE_PREFERENCES: "/api/v1/profile/preferences",
  PROFILE_EMAIL: "/api/v1/profile/email",
  PROFILE_PHONE: "/api/v1/profile/phone",
  PROFILE_PASSWORD: "/api/v1/profile/password",
} as const;

export type OtpPurpose =
  | "account_activation"
  | "password_reset"
  | "account_deletion"
  | "email_change"
  | "phone_change"
  | "foa_access";

export type OtpChannel = "sms" | "email";
