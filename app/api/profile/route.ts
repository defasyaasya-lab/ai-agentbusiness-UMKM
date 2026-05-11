import { NextResponse } from "next/server";
import {
  getDemoStoreProfile,
  updateDemoStoreProfile,
} from "@/lib/db/profile-repository";
import type { StoreProfileUpdate } from "@/lib/profile/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const profile = await getDemoStoreProfile();
  return NextResponse.json(profile, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function PUT(request: Request) {
  try {
    const update = (await request.json()) as StoreProfileUpdate;
    const profile = await updateDemoStoreProfile(update);

    return NextResponse.json(profile, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[profile:route] invalid profile payload", error);
    return NextResponse.json(
      { error: "Payload profil toko tidak valid." },
      { status: 400 },
    );
  }
}
