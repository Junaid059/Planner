import { MongoClient, Db, Collection, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/studyflow";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve the client across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export { clientPromise, ObjectId };

// Database name
const DB_NAME = "studyflow";

// Get database instance
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  STUDY_PLANS: "study_plans",
  TASKS: "tasks",
  SUBTASKS: "subtasks",
  POMODORO_SESSIONS: "pomodoro_sessions",
  TIMER_SETTINGS: "timer_settings",
  DAILY_STATS: "daily_stats",
  STUDY_STREAKS: "study_streaks",
  ACHIEVEMENTS: "achievements",
  USER_ACHIEVEMENTS: "user_achievements",
  REFRESH_TOKENS: "refresh_tokens",
  SUBSCRIPTIONS: "subscriptions",
  PAYMENTS: "payments",
  TEAMS: "teams",
  TEAM_MEMBERS: "team_members",
  TEAM_INVITES: "team_invites",
  ACTIVITY_LOGS: "activity_logs",
  VERIFICATION_TOKENS: "verification_tokens",
  FLASHCARD_DECKS: "flashcard_decks",
  FLASHCARDS: "flashcards",
  NOTES: "notes",
} as const;

// Get typed collections
export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

// Helper to convert string ID to ObjectId
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

// Helper to check if string is valid ObjectId
export function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return true;
  } catch {
    return false;
  }
}
