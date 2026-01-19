// Flashcard Cards API - List and Create cards for a deck
import { NextRequest, NextResponse } from 'next/server';
import { getDb, toObjectId } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import { ObjectId } from 'mongodb';

interface FlashcardCard {
  _id?: ObjectId;
  deckId: ObjectId;
  userId: ObjectId;
  front: string;
  back: string;
  difficulty: number;
  nextReview?: Date;
  reviewCount: number;
  correctCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/flashcards/decks/[id]/cards - List all cards in a deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const db = await getDb();
    const cardsCollection = db.collection<FlashcardCard>('flashcard_cards');
    const userId = toObjectId(payload.userId);
    const deckId = toObjectId(id);

    const cards = await cardsCollection
      .find({ deckId, userId })
      .sort({ createdAt: -1 })
      .toArray();

    const cardsWithId = cards.map(card => ({
      ...card,
      id: card._id!.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: cardsWithId,
    });
  } catch (error) {
    console.error('List cards error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/flashcards/decks/[id]/cards - Create a new card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    const { front, back } = body;

    if (!front || !back) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Front and back are required' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cardsCollection = db.collection<FlashcardCard>('flashcard_cards');
    const decksCollection = db.collection('flashcard_decks');
    const userId = toObjectId(payload.userId);
    const deckId = toObjectId(id);

    // Verify deck exists and belongs to user
    const deck = await decksCollection.findOne({ _id: deckId, userId });
    if (!deck) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Deck not found' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const newCard: FlashcardCard = {
      deckId,
      userId,
      front,
      back,
      difficulty: 2.5, // Default difficulty (SM-2 algorithm)
      reviewCount: 0,
      correctCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await cardsCollection.insertOne(newCard);

    // Update deck card count
    await decksCollection.updateOne(
      { _id: deckId },
      { $inc: { cardCount: 1 }, $set: { updatedAt: now } }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...newCard,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
