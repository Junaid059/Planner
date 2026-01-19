import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { getUsageSummary } from "@/lib/subscription-limits";
import { getDb, COLLECTIONS, toObjectId } from "@/lib/db/mongodb";
import { User, Plan } from "@/lib/db/models";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user's plan
    const db = await getDb();
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: toObjectId(payload.userId)
    });

    const userPlan: Plan = (user?.plan as Plan) || "FREE";

    // Get usage summary for the user
    const usage = await getUsageSummary(payload.userId, userPlan);

    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
