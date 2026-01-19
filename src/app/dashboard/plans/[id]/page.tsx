"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  ListTodo,
  StickyNote,
  CreditCard,
  Loader2,
  Trash2,
  Edit,
  Flag,
  Target,
  BookOpen,
  Sparkles,
  MoreVertical,
} from "lucide-react";
import { plansApi, tasksApi, notesApi, flashcardsApi } from "@/lib/api";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  estimatedMinutes?: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  cardCount?: number;
  _count?: { cards: number };
}

interface StudyPlan {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  progress: number;
  status: string;
  color: string | null;
  startDate: string | null;
  endDate: string | null;
}

const priorityColors: Record<string, string> = {
  URGENT: "text-red-500 bg-red-500/10",
  HIGH: "text-orange-500 bg-orange-500/10",
  MEDIUM: "text-yellow-500 bg-yellow-500/10",
  LOW: "text-green-500 bg-green-500/10",
};

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  
  // Dialog states
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    estimatedMinutes: 30,
  });
  
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
  });
  
  const [newDeck, setNewDeck] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load plan details
        const planRes = await plansApi.get(resolvedParams.id);
        if (planRes.success && planRes.data) {
          setPlan(planRes.data as StudyPlan);
        }
        
        // Load tasks for this plan
        const tasksRes = await tasksApi.list({ planId: resolvedParams.id });
        if (tasksRes.success && tasksRes.data) {
          setTasks(tasksRes.data as Task[]);
        }
        
        // Load notes
        const notesRes = await notesApi.list({ planId: resolvedParams.id });
        if (notesRes.success && notesRes.data) {
          setNotes(notesRes.data as Note[]);
        }
        
        // Load flashcard decks
        const decksRes = await flashcardsApi.listDecks({ planId: resolvedParams.id });
        if (decksRes.success && decksRes.data) {
          setDecks(decksRes.data as FlashcardDeck[]);
        }
      } catch (error) {
        console.error("Failed to load plan data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [resolvedParams.id]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    setSaving(true);
    try {
      const result = await tasksApi.create({
        ...newTask,
        planId: resolvedParams.id,
        status: "TODO",
      });
      
      if (result.success && result.data) {
        setTasks((prev) => [result.data as Task, ...prev]);
        setShowAddTask(false);
        setNewTask({ title: "", description: "", priority: "MEDIUM", dueDate: "", estimatedMinutes: 30 });
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    
    try {
      await tasksApi.update(taskId, { status: newStatus });
    } catch (error) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await tasksApi.delete(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim()) return;
    
    setSaving(true);
    try {
      const result = await notesApi.create({
        ...newNote,
        planId: resolvedParams.id,
      });
      
      if (result.success && result.data) {
        setNotes((prev) => [result.data as Note, ...prev]);
        setShowAddNote(false);
        setNewNote({ title: "", content: "" });
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDeck = async () => {
    if (!newDeck.title.trim()) return;
    
    setSaving(true);
    try {
      const result = await flashcardsApi.createDeck({
        ...newDeck,
        planId: resolvedParams.id,
      });
      
      if (result.success && result.data) {
        setDecks((prev) => [result.data as FlashcardDeck, ...prev]);
        setShowAddDeck(false);
        setNewDeck({ title: "", description: "" });
      }
    } catch (error) {
      console.error("Failed to add deck:", error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Plan not found</p>
        <Button variant="link" onClick={() => router.push("/dashboard/plans")}>
          Back to Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/plans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${plan.color || "from-blue-500 to-cyan-500"}`}>
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{plan.title}</h1>
                {plan.subject && <Badge variant="secondary" className="mt-1">{plan.subject}</Badge>}
              </div>
            </div>
            {plan.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">{plan.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan.endDate && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Due {new Date(plan.endDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-2xl font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notes.length + decks.length}</p>
                <p className="text-sm text-muted-foreground">Study Materials</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Flashcards ({decks.length})
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Plan Tasks</h2>
            <Button onClick={() => setShowAddTask(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
          
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No tasks yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Break down your plan into actionable tasks
                  </p>
                  <Button onClick={() => setShowAddTask(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className={`transition-all ${task.status === "COMPLETED" ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.status === "COMPLETED"}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <Badge variant="secondary" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                          {task.estimatedMinutes && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimatedMinutes}m
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Study Notes</h2>
            <Button onClick={() => setShowAddNote(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.length === 0 ? (
              <Card className="border-dashed col-span-full">
                <CardContent className="py-12 text-center">
                  <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No notes yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create notes to organize your study materials
                  </p>
                  <Button onClick={() => setShowAddNote(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first note
                  </Button>
                </CardContent>
              </Card>
            ) : (
              notes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {note.content || "No content"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Flashcard Decks</h2>
            <Button onClick={() => setShowAddDeck(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Deck
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.length === 0 ? (
              <Card className="border-dashed col-span-full">
                <CardContent className="py-12 text-center">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No flashcard decks yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create flashcard decks to test your knowledge
                  </p>
                  <Button onClick={() => setShowAddDeck(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first deck
                  </Button>
                </CardContent>
              </Card>
            ) : (
              decks.map((deck) => (
                <Card key={deck.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/flashcards/${deck.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {deck.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {deck.description || "No description"}
                    </p>
                    <Badge variant="secondary" className="mt-3">
                      {deck._count?.cards || deck.cardCount || 0} cards
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task to Plan</DialogTitle>
            <DialogDescription>
              Create a new task for &quot;{plan.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Add details..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <div className="flex gap-1">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={newTask.priority === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewTask({ ...newTask, priority: p })}
                      className={newTask.priority === p ? priorityColors[p] : ""}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Time (minutes)</label>
              <Input
                type="number"
                value={newTask.estimatedMinutes}
                onChange={(e) => setNewTask({ ...newTask, estimatedMinutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!newTask.title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Create a study note for &quot;{plan.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Note title"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Write your notes here..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!newNote.title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deck Dialog */}
      <Dialog open={showAddDeck} onOpenChange={setShowAddDeck}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Flashcard Deck</DialogTitle>
            <DialogDescription>
              Create a new deck for &quot;{plan.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Deck title"
                value={newDeck.title}
                onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What topics does this deck cover?"
                value={newDeck.description}
                onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeck(false)}>Cancel</Button>
            <Button onClick={handleAddDeck} disabled={!newDeck.title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Deck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
