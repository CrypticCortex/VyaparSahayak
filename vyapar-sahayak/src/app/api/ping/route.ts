import { NextResponse } from "next/server";

export async function GET() {
  const standaloneConfig = process.env.__NEXT_PRIVATE_STANDALONE_CONFIG;
  let parsedConfig: Record<string, unknown> = {};
  if (standaloneConfig) {
    try {
      parsedConfig = JSON.parse(standaloneConfig);
    } catch {
      parsedConfig = { raw: standaloneConfig.substring(0, 200) };
    }
  }

  return NextResponse.json({
    pong: true,
    dbUrlSet: !!process.env.DATABASE_URL,
    standaloneConfigKeys: Object.keys(parsedConfig),
    hasEnv: 'env' in parsedConfig,
    envKeys: parsedConfig.env ? Object.keys(parsedConfig.env as Record<string, unknown>) : [],
    time: new Date().toISOString(),
  });
}
