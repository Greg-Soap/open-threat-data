
export const API_ROUTES = {
  GET: [
    '/auth/verify-email',
    '/auth/verify-email-change',
    '/user/sessions',
    '/user/settings',
    '/audits',
    '/audits/recent',
    '/intel/monitor',
    '/intel/latency/sample',
  ] as const,
  POST: [
    '/auth/signup',
    '/auth/login',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email/resend',
    '/user/avatar',
    '/user/sessions/revoke',
    '/user/sessions/revoke-all',
    '/intel/ip',
    '/intel/domain',
    '/intel/hash',
    '/intel/ssl',
    '/intel/email',
    '/intel/latency',
    '/intel/url-tracer',
    '/intel/comment',
  ] as const,
  PUT: ['/user/profile', '/user/password', '/user/settings'] as const,
  DELETE: ['/user/avatar', '/user/account'] as const,
}

type ReplaceParam<T extends string> =
  T extends `${infer Start}:${infer _Param}/${infer Rest}`
    ? `${Start}${string}/${ReplaceParam<Rest>}`
    : T extends `${infer Start}:${infer _Param}`
      ? `${Start}${string}`
      : T;

type TransformRoutes<T extends readonly string[]> = {
  [K in keyof T]: T[K] | ReplaceParam<T[K]>;
}[number];

export type APIRoutes = {
  [K in keyof typeof API_ROUTES]: TransformRoutes<typeof API_ROUTES[K]>;
};

export type APIRouteStatic = {
  [K in keyof typeof API_ROUTES]: typeof API_ROUTES[K][number];
};

// Usage example:
// const apiRoutes: APIRoutes = API_ROUTES as any;
