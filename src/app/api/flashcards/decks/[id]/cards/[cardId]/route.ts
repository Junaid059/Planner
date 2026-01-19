// Flashcard Card by ID API - Get, Update, Delete a specific card
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

// GET /api/flashcards/decks/[id]/cards/[cardId] - Get a specific card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { id, cardId } = await params;
    
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

    const card = await cardsCollection.findOne({
      _id: toObjectId(cardId),
      deckId: toObjectId(id),
      userId,
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Card not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...card,
        id: card._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/flashcards/decks/[id]/cards/[cardId] - Update a card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { id, cardId } = await params;
    
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
    const { front, back, difficulty, nextReview } = body;

    const db = await getDb();
    const cardsCollection = db.collection<FlashcardCard>('flashcard_cards');
    const userId = toObjectId(payload.userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (front !== undefined) updateData.front = front;
    if (back !== undefined) updateData.back = back;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (nextReview !== undefined) updateData.nextReview = new Date(nextReview);

    const result = await cardsCollection.findOneAndUpdate(
      { _id: toObjectId(cardId), deckId: toObjectId(id), userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Card not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: result._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/flashcards/decks/[id]/cards/[cardId] - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { id, cardId } = await params;
    
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
    const decksCollection = db.collection('flashcard_decks');
    const userId = toObjectId(payload.userId);
    const deckId = toObjectId(id);

    const result = await cardsCollection.deleteOne({
      _id: toObjectId(cardId),
      deckId,
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Card not found' } },
        { status: 404 }
      );
    }

    // Update deck card count
    await decksCollection.updateOne(
      { _id: deckId },
      { $inc: { cardCount: -1 }, $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Card deleted successfully' },
    });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
