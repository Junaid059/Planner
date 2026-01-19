"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Brain,
  Plus,
  Shuffle,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Loader2,
  BookOpen,
  Flame,
  Target,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { flashcardsApi } from "@/lib/api";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  mastered: boolean;
  reviewCount: number;
  lastReviewed?: string;
}

interface Deck {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
  masteredCount: number;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", description: "" });
  const [newCard, setNewCard] = useState({ front: "", back: "" });

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const response = await flashcardsApi.listDecks();
      if (response.success && response.data) {
        setDecks(response.data as Deck[]);
      }
    } catch (error) {
      console.error("Failed to fetch decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectDeck = async (deck: Deck) => {
    try {
      setLoading(true);
      setCurrentDeck(deck);
      const response = await flashcardsApi.listCards(deck.id);
      if (response.success && response.data) {
        setCards(response.data as Flashcard[]);
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const startStudy = () => {
    if (cards.length > 0) {
      setStudyMode(true);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSessionStats({ correct: 0, incorrect: 0 });
      // Shuffle cards
      setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    }
  };

  const handleAnswer = async (correct: boolean) => {
    const card = cards[currentIndex];
    if (!card) return;

    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }));

    try {
      await flashcardsApi.reviewCard(card.id, correct);
    } catch (error) {
      console.error("Failed to update card:", error);
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      setStudyMode(false);
    }
  };

  const createDeck = async () => {
    if (!newDeck.name) return;
    try {
      const response = await flashcardsApi.createDeck(newDeck);
      if (response.success) {
        fetchDecks();
        setNewDeckOpen(false);
        setNewDeck({ name: "", description: "" });
      }
    } catch (error) {
      console.error("Failed to create deck:", error);
    }
  };

  const createCard = async () => {
    if (!newCard.front || !newCard.back || !currentDeck) return;
    try {
      const response = await flashcardsApi.createCard({
        ...newCard,
        deckId: currentDeck.id,
      });
      if (response.success) {
        selectDeck(currentDeck);
        setNewCardOpen(false);
        setNewCard({ front: "", back: "" });
      }
    } catch (error) {
      console.error("Failed to create card:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading flashcards...</p>
        </motion.div>
      </div>
    );
  }

  // Study Mode View
  if (studyMode && currentDeck && cards.length > 0) {
    const currentCard = cards[currentIndex];
    const progress = ((currentIndex + 1) / cards.length) * 100;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Study Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => setStudyMode(false)}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Exit Study
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Card {currentIndex + 1} of {cards.length}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-green-500 font-medium">
                {sessionStats.correct} correct
              </span>
              <span className="text-red-500 font-medium">
                {sessionStats.incorrect} incorrect
              </span>
            </div>
          </div>
          <div className="w-20" />
        </motion.div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card
            className="border-0 shadow-2xl min-h-[400px] cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px]">
              <AnimatePresence mode="wait">
                {!showAnswer ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    className="text-center"
                  >
                    <Badge className="mb-6">Question</Badge>
                    <p className="text-2xl font-medium">{currentCard?.front}</p>
                    <p className="text-sm text-muted-foreground mt-8">
                      Click to reveal answer
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: -90 }}
                    className="text-center"
                  >
                    <Badge variant="secondary" className="mb-6">
                      Answer
                    </Badge>
                    <p className="text-2xl font-medium text-primary">
                      {currentCard?.back}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Answer Buttons */}
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4"
          >
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-red-500 border-red-500/20 hover:bg-red-500/10"
              onClick={() => handleAnswer(false)}
            >
              <X className="h-5 w-5" />
              Got it wrong
            </Button>
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500"
              onClick={() => handleAnswer(true)}
            >
              <Check className="h-5 w-5" />
              Got it right
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // Study Complete View
  if (
    !studyMode &&
    sessionStats.correct + sessionStats.incorrect > 0 &&
    currentDeck
  ) {
    const total = sessionStats.correct + sessionStats.incorrect;
    const accuracy = Math.round((sessionStats.correct / total) * 100);

    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Study Session Complete!</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-green-500/10">
                  <p className="text-3xl font-bold text-green-500">
                    {sessionStats.correct}
                  </p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10">
                  <p className="text-3xl font-bold text-red-500">
                    {sessionStats.incorrect}
                  </p>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10">
                  <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => selectDeck(currentDeck)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Study Again
                </Button>
                <Button
                  onClick={() => {
                    setCurrentDeck(null);
                    setSessionStats({ correct: 0, incorrect: 0 });
                  }}
                >
                  Back to Decks
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Deck Detail View
  if (currentDeck) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <Button
              variant="ghost"
              onClick={() => setCurrentDeck(null)}
              className="gap-2 mb-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Decks
            </Button>
            <h1 className="text-2xl font-bold">{currentDeck.name}</h1>
            <p className="text-muted-foreground">
              {cards.length} cards in this deck
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={newCardOpen} onOpenChange={setNewCardOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Flashcard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Front (Question)</label>
                    <Textarea
                      value={newCard.front}
                      onChange={(e) =>
                        setNewCard({ ...newCard, front: e.target.value })
                      }
                      placeholder="Enter the question..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Back (Answer)</label>
                    <Textarea
                      value={newCard.back}
                      onChange={(e) =>
                        setNewCard({ ...newCard, back: e.target.value })
                      }
                      placeholder="Enter the answer..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={createCard} className="w-full">
                    Create Card
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={startStudy} className="gap-2" disabled={cards.length === 0}>
              <Brain className="h-4 w-4" />
              Start Study
            </Button>
          </div>
        </motion.div>

        {/* Cards Grid */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant={card.mastered ? "default" : "secondary"}>
                        {card.mastered ? "Mastered" : "Learning"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Reviewed {card.reviewCount}x
                      </span>
                    </div>
                    <p className="font-medium mb-2">{card.front}</p>
                    <p className="text-sm text-muted-foreground">{card.back}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cards yet</h3>
              <p className="text-muted-foreground mb-4">
                Add flashcards to start studying
              </p>
              <Button onClick={() => setNewCardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Card
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Decks List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Flashcards
          </h1>
          <p className="text-muted-foreground">
            Create and study flashcard decks
          </p>
        </div>
        <Dialog open={newDeckOpen} onOpenChange={setNewDeckOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Deck Name</label>
                <Input
                  value={newDeck.name}
                  onChange={(e) =>
                    setNewDeck({ ...newDeck, name: e.target.value })
                  }
                  placeholder="e.g., Biology Chapter 5"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  value={newDeck.description}
                  onChange={(e) =>
                    setNewDeck({ ...newDeck, description: e.target.value })
                  }
                  placeholder="What's this deck about?"
                  className="mt-1"
                />
              </div>
              <Button onClick={createDeck} className="w-full">
                Create Deck
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{decks.length}</p>
                <p className="text-sm text-muted-foreground">Total Decks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {decks.reduce((acc, d) => acc + (d.masteredCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Cards Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {decks.reduce((acc, d) => acc + (d.cardCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decks Grid */}
      {decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => selectDeck(deck)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary">{deck.cardCount} cards</Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {deck.name}
                  </h3>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {deck.masteredCount || 0}/{deck.cardCount} mastered
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Study
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-xl">
          <CardContent className="py-16 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No flashcard decks yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first deck to start studying with flashcards
            </p>
            <Button onClick={() => setNewDeckOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Deck
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
