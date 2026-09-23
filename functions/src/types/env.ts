export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

export type EnvBindings = {
  ALLOW_DEV_AUTH_BYPASS?: string;
  JWT_SECRET?: string;
  FIREBASE_DATABASE_EMULATOR_HOST?: string;
};

export type HonoEnv = {
  Bindings: EnvBindings;
  Variables: {
    user: AuthenticatedUser;
  };
};
