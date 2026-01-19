import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { getDb, COLLECTIONS } from "@/lib/db/mongodb";
import { cookies } from "next/headers";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if user is admin by querying the database
    const db = await getDb();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: payload.userId as unknown as import("mongodb").ObjectId });
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get database stats
    const dbStats = await db.command({ dbStats: 1 });
    
    // Get collection stats
    const collectionNames = Object.values(COLLECTIONS);
    const collections = [];
    let totalDocuments = 0;
    let totalSize = 0;

    for (const name of collectionNames) {
      try {
        const stats = await db.command({ collStats: name });
        const count = stats.count || 0;
        const size = stats.size || 0;
        
        collections.push({
          name,
          count,
          size: formatBytes(size),
        });
        
        totalDocuments += count;
        totalSize += size;
      } catch {
        // Collection might not exist yet
        collections.push({
          name,
          count: 0,
          size: "0 B",
        });
      }
    }

    // Sort by document count descending
    collections.sort((a, b) => b.count - a.count);

    // Extract host from connection string (simplified)
    const connectionString = process.env.MONGODB_URI || "";
    let host = "localhost";
    try {
      const match = connectionString.match(/@([^/]+)/);
      if (match) {
        host = match[1];
      }
    } catch {
      // Ignore parsing errors
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        host,
        database: db.databaseName,
        collections,
        totalDocuments,
        totalSize: formatBytes(totalSize),
        storageSize: formatBytes(dbStats.storageSize || 0),
        indexSize: formatBytes(dbStats.indexSize || 0),
      },
    });
  } catch (error) {
    console.error("Database status error:", error);
    return NextResponse.json({
      success: false,
      data: {
        connected: false,
        host: "unknown",
        database: "unknown",
        collections: [],
        totalDocuments: 0,
        totalSize: "0 B",
      },
      error: "Failed to connect to database",
    });
  }
}
