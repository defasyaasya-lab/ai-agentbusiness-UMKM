import { NextResponse } from "next/server";
import {
  getConnectivityStatus,
  updateConnectivityStatus,
} from "@/lib/connectivity/mock-agent-service";
import type { ConnectivityStatusUpdate } from "@/lib/connectivity/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  console.log("[connectivity:route] GET /api/connectivity/status");
  const state = await getConnectivityStatus();
  console.log("[connectivity:route] GET returning shared state", state);
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as ConnectivityStatusUpdate;
    console.log("[connectivity:route] POST /api/connectivity/status", update);
    const state = await updateConnectivityStatus(update);
    console.log("[connectivity:route] POST updated shared state", state);
    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[connectivity:route] invalid status payload", error);
    return NextResponse.json(
      { error: "Payload status konektivitas tidak valid." },
      { status: 400 },
    );
  }
}
