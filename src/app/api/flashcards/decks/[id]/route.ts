// Flashcard Deck by ID API - Get, Update, Delete
import { NextRequest, NextResponse } from 'next/server';
import { getDb, toObjectId } from '@/lib/db/mongodb';
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

// GET /api/flashcards/decks/[id] - Get a specific deck
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
    const decksCollection = db.collection<FlashcardDeck>('flashcard_decks');
    const userId = toObjectId(payload.userId);

    const deck = await decksCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!deck) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Deck not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...deck,
        id: deck._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Get deck error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/flashcards/decks/[id] - Update a deck
export async function PATCH(
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
    const { title, description } = body;

    const db = await getDb();
    const decksCollection = db.collection<FlashcardDeck>('flashcard_decks');
    const userId = toObjectId(payload.userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const result = await decksCollection.findOneAndUpdate(
      { _id: toObjectId(id), userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Deck not found' } },
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
    console.error('Update deck error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/flashcards/decks/[id] - Delete a deck
export async function DELETE(
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
    const decksCollection = db.collection<FlashcardDeck>('flashcard_decks');
    const cardsCollection = db.collection('flashcard_cards');
    const userId = toObjectId(payload.userId);
    const deckId = toObjectId(id);

    // Delete all cards in the deck
    await cardsCollection.deleteMany({ deckId });

    // Delete the deck
    const result = await decksCollection.deleteOne({
      _id: deckId,
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Deck not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Deck deleted successfully' },
    });
  } catch (error) {
    console.error('Delete deck error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
