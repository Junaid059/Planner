// Flashcard Review API - Record card review results
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

// POST /api/flashcards/cards/[cardId]/review - Record a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    
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
    const { quality } = body; // 0-5 rating (SM-2 algorithm)

    if (quality === undefined || quality < 0 || quality > 5) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Quality must be between 0 and 5' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cardsCollection = db.collection<FlashcardCard>('flashcard_cards');
    const decksCollection = db.collection('flashcard_decks');
    const userId = toObjectId(payload.userId);

    // Get the card
    const card = await cardsCollection.findOne({
      _id: toObjectId(cardId),
      userId,
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT001', message: 'Card not found' } },
        { status: 404 }
      );
    }

    // SM-2 Algorithm
    let difficulty = card.difficulty || 2.5;
    const reviewCount = (card.reviewCount || 0) + 1;
    const correctCount = quality >= 3 ? (card.correctCount || 0) + 1 : card.correctCount || 0;

    // Calculate new difficulty
    difficulty = difficulty + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (difficulty < 1.3) difficulty = 1.3;
    if (difficulty > 2.5) difficulty = 2.5;

    // Calculate next review date
    let interval = 1;
    if (quality >= 3) {
      if (reviewCount === 1) {
        interval = 1;
      } else if (reviewCount === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * difficulty);
      }
    } else {
      interval = 1; // Reset on failure
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    const now = new Date();
    
    // Update card
    const result = await cardsCollection.findOneAndUpdate(
      { _id: toObjectId(cardId), userId },
      {
        $set: {
          difficulty,
          nextReview,
          reviewCount,
          correctCount,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    // Update deck lastStudied and mastered count
    const isMastered = correctCount >= 3 && difficulty >= 2.3;
    const wasMastered = (card.correctCount || 0) >= 3 && (card.difficulty || 2.5) >= 2.3;
    
    const deckUpdate: Record<string, unknown> = { lastStudied: now, updatedAt: now };
    if (isMastered && !wasMastered) {
      await decksCollection.updateOne(
        { _id: card.deckId },
        { $set: deckUpdate, $inc: { masteredCount: 1 } }
      );
    } else if (!isMastered && wasMastered) {
      await decksCollection.updateOne(
        { _id: card.deckId },
        { $set: deckUpdate, $inc: { masteredCount: -1 } }
      );
    } else {
      await decksCollection.updateOne(
        { _id: card.deckId },
        { $set: deckUpdate }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: result?._id?.toString(),
        nextReview,
        interval,
      },
    });
  } catch (error) {
    console.error('Review card error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
