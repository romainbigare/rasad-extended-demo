export type RegisterReqData = {
  email: string;
  ph: string;
  country_code: string;
  name: string;
  company_id: number;
  adhaar: string;
  password: string;
};

export type ProfileUpdateReqData = {
  name: string;
  unit: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
};

export type emailUpdateReqData = {
  email: string;
  code: string;
};
export type phoneUpdateReqData = {
  phone: string;
  code: string;
};
export type passwordUpdateReqData = {
  code: string;
  new_password: string;
  confirm_new_password: string;
};

export type LoginReqData = {
  email: string;
  password: string;
};

export type VerifyOtpData = {
  type?: string;
  phone?: string;
  email?: string;
  code?: string;
};

export type ResetPassOtpData = {
  type: string;
  phone: string;
  email?: string;
  code: string;
  password: string;
};
