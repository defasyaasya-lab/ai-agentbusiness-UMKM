import { NextResponse } from "next/server";
import { recordSwitchEvent } from "@/lib/connectivity/mock-agent-service";
import type { SwitchEventUpdate } from "@/lib/connectivity/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as SwitchEventUpdate;
    console.log("[connectivity:route] POST /api/connectivity/switch-events", update);
    const state = recordSwitchEvent(update);
    console.log("[connectivity:route] switch event updated shared state", state);
    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[connectivity:route] invalid switch-event payload", error);
    return NextResponse.json(
      { error: "Payload event perpindahan koneksi tidak valid." },
      { status: 400 },
    );
  }
}
