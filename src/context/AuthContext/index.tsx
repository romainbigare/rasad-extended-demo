import { useRouter } from "next/router";
import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import { isAnyAuthPage, isOtherPage } from "lib/helpers/isAuthPage";
import {
  ADAFSA_PRODUCT_NAME,
  OtpChannel,
  OtpPurpose,
  RBAC_ENDPOINTS,
} from "lib/network/rbac/endpoints";
import { rbacRequest } from "lib/network/rbac/request";
import {
  emailUpdateReqData,
  passwordUpdateReqData,
  phoneUpdateReqData,
  ProfileUpdateReqData,
} from "lib/network/api/request.types";
import {
  AuthState,
  EnterpriseUsers,
  FetchUsersReqData,
  MayBe,
  ProfileResponse,
} from "lib/types";
import { logout } from "lib/utils/auth/logout";
import { getEnterpriseToken } from "lib/utils/auth/token";
import {
  clearRbacTokens,
  getRbacAccessToken,
  getRbacRefreshToken,
  getRbacRoleName,
  setRbacTokens,
} from "lib/utils/auth/rbacToken";
import { toast } from "react-toastify";
import { toastError } from "lib/utils/toast";
import {
  installCleverTapNullFilter,
  sanitizeCleverTapProps,
} from "lib/utils/clevertap";
import { apiRequest } from "lib/network/api/request";
import { API_ENDPOINTS } from "lib/network/api/endpoints";

//Defaults Value
const AuthContext = createContext<AuthState>(null);

type Props = {
  children: ReactNode;
};

function purposeForLoginOtp(data: { for_activation?: boolean }): OtpPurpose {
  if (data.for_activation === true) return "account_activation";
  if (data.for_activation === false) return "password_reset";
  return "account_deletion";
}

/** sendOtpProfile: only called by Profile/EditProfile, for its own email/phone change. */
function purposeForProfileOtp(data: { type?: string }): OtpPurpose {
  return data.type === "email" ? "email_change" : "phone_change";
}

function destinationFrom(data: { phone?: string; email?: string }): string {
  return data.email || data.phone || "";
}

function channelFrom(data: { type?: string; email?: string }): OtpChannel {
  if (data.type === "email") return "email";
  if (data.type === "phone") return "sms";
  return data.email ? "email" : "sms";
}

async function verifyOtpAndGetToken(
  destination: string,
  code: string,
  purpose: OtpPurpose,
): Promise<string> {
  const res = await rbacRequest<{ verification_token: string }>(
    RBAC_ENDPOINTS.OTP_VERIFY,
    "POST",
    { destination, code, purpose },
  );
  return res.data.verification_token;
}

const AuthProvider = ({ children }: Props) => {
  const router = useRouter();
  const [user, setUser] = useState<MayBe<ProfileResponse>>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileFetchError, setProfileFetchError] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const isAuthPage = isAnyAuthPage(router.pathname);
  const isOtherPagePage = isOtherPage(router.pathname);
  const [isOtpVerify, setIsOtpVerify] = useState<boolean>(false);
  const [enterpriseUsersLoading, setEnterpriseUsersLoading] =
    useState<boolean>(false);
  const [enterpriseUsers, setEnterpriseUsers] = useState<{
    data: MayBe<EnterpriseUsers>;
  }>({
    data: null,
  });

  useEffect(() => {
    if (isOtherPagePage) {
      return;
    }
    // Only attempt the profile fetch when a token actually exists -- a bare
    // 401 (no token at all, e.g. the very first visit) must not be treated
    // the same as "your account isn't active" (profileFetchError renders
    // that screen, per ProtectedPage.tsx). No token at all means "not logged
    // in," which just redirects to the login page.
    const hasToken = Boolean(getRbacAccessToken() || getRbacRefreshToken());
    if (hasToken && !isOtpVerify) {
      initialUserData();
    } else {
      logoutUser(!isAuthPage);
    }
  }, []);

  const updateIsVerifyOtpStatus = useCallback((status: boolean) => {
    setIsOtpVerify(status);
    setProfileFetchError(false);
  }, []);

  async function initialUserData() {
    setLoadingProfile(true);
    try {
      const response = await rbacRequest<any>(
        RBAC_ENDPOINTS.PROFILE,
        "GET",
        undefined,
        undefined,
        { silent: true },
      );
      const data = { ...response.data, role_name: getRbacRoleName() };
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      if (typeof window !== "undefined" && window.clevertap) {
        installCleverTapNullFilter();
        window.clevertap.profile.push({
          Site: sanitizeCleverTapProps({
            timestamp: new Date().toString(),
            email: data.email,
            phone: data.phone,
            Role: data.role_id,
            company_id: data.company_id,
            Name: data.name,
            Is_active: data.is_active,
            unit: data.unit,
            country: data.country,
            state: data.state,
            city: data.city,
            notification_active: data.notification_active,
          }),
        });
      }
      setIsAuthenticated(true);
    } catch {
      setProfileFetchError(true);
    }
    setLoadingProfile(false);
  }

  const fetchEtpUser = async (data: FetchUsersReqData) => {
    setEnterpriseUsersLoading(true);
    const res = await apiRequest<EnterpriseUsers, null>(
      API_ENDPOINTS.STATS_ENTERPRISE_USERS,
      "GET",
      null,
      {
        params: {
          api_key: getEnterpriseToken(),
          page: data.page ?? 1,
          size: 15,
          ...(data.searchWord ? { search_word: data.searchWord } : {}),
        },
      },
    );
    setEnterpriseUsersLoading(false);
    if (res) {
      setEnterpriseUsers({ data: res });
    }
  };

  const logoutUser = useCallback((redirect?: boolean) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("reset-farm"));
    }
    clearRbacTokens();

    if (redirect === true) logout(redirect, router.pathname);
    else logout(redirect);
  }, []);

  const handleProfileEmailUpdate = useCallback(
    async (data: emailUpdateReqData) => {
      try {
        const destination = data.email;
        const verificationToken = await verifyOtpAndGetToken(
          destination,
          data.code,
          "email_change",
        );
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.PROFILE_EMAIL,
          "PUT",
          {
            new_email: destination,
            verification_token: verificationToken,
          },
        );
        await initialUserData();
        toast.success("Email Updated Successfully");
        return response;
      } catch {
        return null;
      }
    },
    [],
  );

  const handleProfilePhoneUpdate = useCallback(
    async (data: phoneUpdateReqData) => {
      try {
        const destination = data.phone;
        const verificationToken = await verifyOtpAndGetToken(
          destination,
          data.code,
          "phone_change",
        );
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.PROFILE_PHONE,
          "PUT",
          {
            new_phone: destination,
            verification_token: verificationToken,
          },
        );
        await initialUserData();
        toast.success("Phone Updated Successfully");
        return response;
      } catch {
        return null;
      }
    },
    [],
  );

  const handlePasswordUpdate = useCallback(
    async (
      data: passwordUpdateReqData & { email?: string; phone?: string },
    ) => {
      try {
        const destination = destinationFrom(data);
        const verificationToken = await verifyOtpAndGetToken(
          destination,
          data.code,
          "password_reset",
        );
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.PROFILE_PASSWORD,
          "PUT",
          {
            new_password: data.new_password,
            confirm_new_password: data.confirm_new_password,
            verification_token: verificationToken,
          },
        );
        toast.success("Password Updated Successful");
        return response;
      } catch {
        return null;
      }
    },
    [],
  );

  const handleProfileUpdate = useCallback(
    async (data: ProfileUpdateReqData) => {
      try {
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.PROFILE_UPDATE,
          "PUT",
          data,
        );
        initialUserData();
        toast.success("Profile Updated Successful");
        return response;
      } catch {
        return null;
      }
    },
    [],
  );

  const handlePreferencesUpdate = useCallback(
    async (data: Partial<{ area_unit: string; coord_format: string; locale: string }>) => {
      try {
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.PROFILE_PREFERENCES,
          "PUT",
          data,
        );
        await initialUserData();
        return response;
      } catch {
        return null;
      }
    },
    [],
  );

  const handleLoginUser = useCallback(
    async (data: { username: string; password: string }, rememberMe = true) => {
      setLoading(true);
      try {
        const response = await rbacRequest<any>(
          RBAC_ENDPOINTS.LOGIN,
          "POST",
          {
            username: data.username,
            password: data.password,
            product: ADAFSA_PRODUCT_NAME,
          },
          undefined,
          { silent: true },
        );
        setRbacTokens(
          response.data.access_token,
          response.data.refresh_token,
          rememberMe,
        );
        toast.success("Login Successful");
        setLoading(false);
        return response;
      } catch (error: any) {
        setLoading(false);
        if (error?.status === 403 && /not active/i.test(error?.message || "")) {
          throw { ...error, requiresActivation: true };
        }
        toastError(error?.message || "Sign-in failed. Check your details and try again.");
        throw error;
      }
    },
    [],
  );

  const handleRegisterUser = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        ph: data.ph || undefined,
        country_code: data.country_code ? Number(data.country_code) : undefined,
        email: data.email || undefined,
        password: data.password,
        name: data.name,
        product: ADAFSA_PRODUCT_NAME,
      };
      const response = await rbacRequest<any>(
        RBAC_ENDPOINTS.SIGNUP,
        "POST",
        payload,
      );
      toast.success("Registration Successful");
      setLoading(false);
      return response;
    } catch {
      setLoading(false);
      return undefined;
    }
  }, []);

  const handleVerifyRegisterOtp = useCallback(async (data: any) => {
    try {
      setLoading(true);
      const destination = destinationFrom(data);
      const verificationToken = await verifyOtpAndGetToken(
        destination,
        data.code,
        "account_activation",
      );
      const response = await rbacRequest<any>(RBAC_ENDPOINTS.ACTIVATE, "POST", {
        verification_token: verificationToken,
      });
      toast.success("Activation Successful");
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyOtp = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const destination = destinationFrom(data);
      const verificationToken = await verifyOtpAndGetToken(
        destination,
        data.code,
        "account_activation",
      );
      const response = await rbacRequest<any>(RBAC_ENDPOINTS.ACTIVATE, "POST", {
        verification_token: verificationToken,
      });
      toast.success("Account activated. Please log in.");
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginWithOtp = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const purpose = purposeForLoginOtp(data);
      const destination = destinationFrom(data);
      const channel = channelFrom(data);
      const response = await rbacRequest<any>(RBAC_ENDPOINTS.OTP_SEND, "POST", {
        destination,
        channel,
        purpose,
      });
      toast.success(
        channel === "email"
          ? "OTP is sent to your email. Please check your inbox and also SPAM Folder before requesting a new OTP"
          : "OTP Sent Successfully",
      );
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOtpForProfile = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const purpose = purposeForProfileOtp(data);
      const destination = destinationFrom(data);
      const channel = channelFrom(data);
      const response = await rbacRequest<any>(RBAC_ENDPOINTS.OTP_SEND, "POST", {
        destination,
        channel,
        purpose,
      });
      toast.success(
        channel === "email"
          ? "OTP is sent to your email. Please check your inbox and also SPAM Folder before requesting a new OTP"
          : "OTP Sent Successfully",
      );
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteProfile = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const destination = destinationFrom(data);
      const verificationToken = await verifyOtpAndGetToken(
        destination,
        data.code,
        "account_deletion",
      );
      const response = await rbacRequest<any>(
        RBAC_ENDPOINTS.DELETE_ACCOUNT,
        "DELETE",
        { verification_token: verificationToken },
      );
      toast.success("Account Deleted Successfully!");
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResetPassWithOtp = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const destination = destinationFrom(data);
      const verificationToken = await verifyOtpAndGetToken(
        destination,
        data.code,
        "password_reset",
      );
      const response = await rbacRequest<any>(
        RBAC_ENDPOINTS.PASSWORD_RESET,
        "PUT",
        {
          verification_token: verificationToken,
          new_password: data.password,
          confirm_new_password: data.confirmPassword ?? data.password,
        },
      );
      toast.success("Password Reset Successfully");
      return response;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  // states
  const values: AuthState = {
    user,
    isOtpVerify,
    loading,
    loadingProfile,
    isAuthenticated,
    profileFetchError,
    isAuthPage,
    enterpriserUsers: enterpriseUsers.data?.items ? enterpriseUsers.data : null,
    enterpriseUsersLoading,
    // methods
    fetchEtpUser,
    initialUserData,
    updateProfile: handleProfileUpdate,
    updatePreferences: handlePreferencesUpdate,
    updateEmail: handleProfileEmailUpdate,
    updatePhone: handleProfilePhoneUpdate,
    updatePassword: handlePasswordUpdate,
    login: handleLoginUser,
    logout: logoutUser,
    register: handleRegisterUser,
    otpLogin: handleLoginWithOtp,
    sendOtp: handleLoginWithOtp,
    sendOtpProfile: handleOtpForProfile,
    deleteProfile: handleDeleteProfile,
    otpVerify: handleVerifyOtp,
    resetPassOtp: handleResetPassWithOtp,
    verifyRegisterOtp: handleVerifyRegisterOtp,
    updateIsVerifyOtpStatus: updateIsVerifyOtpStatus,
  };
  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider };
