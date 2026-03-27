import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Hardcoded demo users -- no database table needed
const DEMO_USERS = [
  { id: "1", name: "Kalyan", username: "kalyan", password: "kalyan123", role: "distributor", zoneCode: "" },
  { id: "2", name: "Ravi", username: "ravi", password: "ravi123", role: "salesman", zoneCode: "TN-URB" },
  { id: "3", name: "Murugan", username: "murugan", password: "murugan123", role: "kirana", zoneCode: "TN-TWN" },
] as const;

export type UserRole = "distributor" | "salesman" | "kirana";

// Tools allowed per role (empty array = all tools allowed)
export const ROLE_TOOLS: Record<UserRole, string[]> = {
  distributor: [], // full access
  salesman: [
    "get_dashboard_summary",
    "get_alerts",
    "get_alert_detail",
    "get_pending_orders",
    "get_network_overview",
    "check_retailer_activity",
    "query_knowledge_base",
  ],
  kirana: [
    "get_campaigns",
    "get_campaign_detail",
    "query_knowledge_base",
  ],
};

export function canAccess(role: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(role);
}

// Filter tools based on user role
// Returns true if the tool is allowed for this role
export function isToolAllowed(role: UserRole, toolName: string): boolean {
  const allowed = ROLE_TOOLS[role];
  if (!allowed || allowed.length === 0) return true; // empty = all tools
  return allowed.includes(toolName);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Demo Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = DEMO_USERS.find(
          (u) =>
            u.username === credentials?.username &&
            u.password === credentials?.password
        );
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          zoneCode: user.zoneCode,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.zoneCode = (user as { zoneCode: string }).zoneCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string;
        (session.user as { zoneCode: string }).zoneCode = token.zoneCode as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
