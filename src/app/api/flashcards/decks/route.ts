// Flashcard Decks API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import { ObjectId } from 'mongodb';

interface FlashcardDeck {
  _id?: ObjectId;
  userId: ObjectId;
  planId?: ObjectId;
  title: string;
  description?: string;
  cardCount: number;
  masteredCount: number;
  lastStudied?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/flashcards/decks - List all decks for user
export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? await verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const db = await getDb();
    const decksCollection = db.collection<FlashcardDeck>('flashcard_decks');
    const userId = toObjectId(payload.userId);

    // Build filter
    const filter: Record<string, unknown> = { userId };
    if (planId) {
      filter.planId = toObjectId(planId);
    }

    // Get decks with pagination
    const [decks, total] = await Promise.all([
      decksCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      decksCollection.countDocuments(filter),
    ]);

    const decksWithId = decks.map(deck => ({
      ...deck,
      id: deck._id!.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: decksWithId,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + decks.length < total,
      },
    });
  } catch (error) {
    console.error('List decks error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/flashcards/decks - Create a new deck
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? await verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, planId } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Title is required' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const decksCollection = db.collection<FlashcardDeck>('flashcard_decks');
    const userId = toObjectId(payload.userId);

    const now = new Date();
    const newDeck: FlashcardDeck = {
      userId,
      title,
      description: description || '',
      cardCount: 0,
      masteredCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (planId) {
      newDeck.planId = toObjectId(planId);
    }

    const result = await decksCollection.insertOne(newDeck);

    return NextResponse.json({
      success: true,
      data: {
        ...newDeck,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create deck error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
