import type { UserRole } from "@/auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    zoneCode: string;
  }

  interface Session {
    user: User & {
      name: string;
      role: UserRole;
      zoneCode: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: string;
    zoneCode: string;
  }
}
