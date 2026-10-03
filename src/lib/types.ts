import { logout } from "./utils/auth/logout";
import { ProfileUpdateReqData } from "./network/api/request.types";

export type MayBe<T> = T | null;

export type ErrorObj = {
  message?: string;
  status_code?: number;
  error_code?: string;
  data?: any;
  timestamp?: string;
};

export type ProfileResponse = MayBe<{
  token: string;
  token_type: string;
  email: string;
  phone: string;
  role: string;
  apikey: string;
  is_active: boolean;
  name?: string;
  id?: string;
  country?: string;
  city?: string;
  state?: string;
  postcode?: string;
  unit?: string;
  data?: any;
  access_token?: string;
  refresh_token?: string;
  workspace?: string;
  role_id?: number;
  role_name?: string;
}>;

export interface EnterpriseUsers {
  items: Et_Users[];
  total: number;
  page: number;
  size: number;
  pages: number;
  loading: boolean;
}

export interface Et_Users {
  id: string;
  apikey: string;
  name: string;
}

export type AuthRes = Promise<ProfileResponse | undefined>;
export type StringApiRes = Promise<string | undefined | null>;
type UpdateIsVerifyOtpStatus = (status: boolean) => void;
type handleProfileUpdate = (data: ProfileUpdateReqData) => void;
type AuthFunction<T, D> = (data: T) => D;

export type FetchUsersReqData = {
  page: number;
  searchWord: string;
};

export type AuthState = MayBe<{
  user: ProfileResponse;
  isOtpVerify: boolean;
  initialUserData: any;
  isAuthenticated: boolean;
  profileFetchError: boolean;
  isAuthPage: boolean;
  loading: boolean;
  loadingProfile: boolean;
  enterpriserUsers: MayBe<EnterpriseUsers>;
  enterpriseUsersLoading: boolean;
  updateProfile: handleProfileUpdate;
  updatePreferences: AuthFunction<Partial<{ area_unit: string; coord_format: string; locale: string }>, Promise<any>>;
  updatePassword: AuthFunction<any, Promise<any>>;
  updateEmail: AuthFunction<any, Promise<any>>;
  updatePhone: AuthFunction<any, Promise<any>>;
  logout: typeof logout;
  updateIsVerifyOtpStatus: UpdateIsVerifyOtpStatus;
  login: any;
  register: AuthFunction<any, Promise<any>>;
  otpLogin: AuthFunction<any, Promise<any>>;
  resetPassOtp: AuthFunction<any, Promise<any>>;
  sendOtp: AuthFunction<any, Promise<any>>;
  sendOtpProfile: AuthFunction<any, Promise<any>>;
  deleteProfile: AuthFunction<any, Promise<any>>;
  otpVerify: AuthFunction<any, Promise<any>>;
  verifyRegisterOtp: AuthFunction<any, Promise<any>>;
  fetchEtpUser: AuthFunction<FetchUsersReqData, Promise<void>>;
}>;
