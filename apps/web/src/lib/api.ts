import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1`,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// Injeta access token em todas as requisições
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Renova token automaticamente em 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("Sem refresh token");

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          { refreshToken },
        );

        localStorage.setItem("access_token", data.accessToken);
        localStorage.setItem("refresh_token", data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(original);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// Helpers tipados
export const authApi = {
  register: (data: any)  => api.post("/auth/register", data),
  login:    (data: any)  => api.post("/auth/login", data),
  refresh:  (token: string) => api.post("/auth/refresh", { refreshToken: token }),
  logout:   ()           => api.delete("/auth/logout"),
  verifyEmail: (token: string) => api.post("/auth/verify-email", { token }),
  me:       ()           => api.get("/auth/me"),
  setup2fa: ()           => api.post("/auth/2fa/setup"),
  confirm2fa: (code: string) => api.post("/auth/2fa/confirm", { code }),
};

export const usersApi = {
  getProfile:      (artisticName: string) => api.get(`/users/profile/${artisticName}`),
  getMyProfile:    ()                     => api.get("/users/me"),
  updateProfile:   (data: any)            => api.patch("/users/me", data),
  getKycStatus:    ()                     => api.get("/users/me/kyc/status"),
  submitKyc:       (data: any)            => api.post("/users/me/kyc/submit", data),
  requestDeletion: ()                     => api.post("/users/me/data-deletion"),
  exportData:      ()                     => api.get("/users/me/data-export"),
};

export const subscriptionsApi = {
  createPlan:       (data: any)         => api.post("/subscriptions/plans", data),
  updatePlan:       (id: string, data: any) => api.patch(`/subscriptions/plans/${id}`, data),
  deactivatePlan:   (id: string)        => api.delete(`/subscriptions/plans/${id}`),
  getCreatorPlans:  (creatorId: string) => api.get(`/subscriptions/plans/creator/${creatorId}`),
  subscribe:        (data: any)         => api.post("/subscriptions/subscribe", data),
  cancel:           (id: string, data?: any) => api.delete(`/subscriptions/${id}`, { data }),
  getMine:          ()                  => api.get("/subscriptions/mine"),
  getSubscribers:   (page = 1)          => api.get(`/subscriptions/subscribers?page=${page}`),
};

export const ppvApi = {
  create:       (data: any)        => api.post("/ppv", data),
  listByCreator:(creatorId: string) => api.get(`/ppv/creator/${creatorId}`),
  getOne:       (id: string)        => api.get(`/ppv/${id}`),
  purchase:     (id: string, data: any) => api.post(`/ppv/${id}/purchase`, data),
  myPurchases:  ()                  => api.get("/ppv/mine/purchases"),
};

export const withdrawalsApi = {
  getBalance: ()         => api.get("/withdrawals/balance"),
  request:    (data: any) => api.post("/withdrawals", data),
  getHistory: (page = 1) => api.get(`/withdrawals/history?page=${page}`),
};

export const paymentsApi = {
  getTransactions: (page = 1) => api.get(`/payments/transactions?page=${page}`),
};
