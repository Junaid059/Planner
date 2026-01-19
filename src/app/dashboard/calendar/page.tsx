"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  BookOpen,
  Loader2,
  Trash2,
  Target,
  AlertTriangle,
  Check,
} from "lucide-react";
import { tasksApi, studyPlanApi } from "@/lib/api";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: "task" | "study" | "deadline" | "custom";
  priority?: string;
  source?: "task" | "plan" | "custom";
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "task" as "task" | "study" | "deadline" | "custom",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [tasksRes, plansRes] = await Promise.all([
          tasksApi.list({ limit: 100 }),
          studyPlanApi.list(),
        ]);

        const calendarEvents: CalendarEvent[] = [];

        // Load saved custom events from localStorage
        const savedEvents = localStorage.getItem("calendarEvents");
        if (savedEvents) {
          try {
            const parsed = JSON.parse(savedEvents);
            parsed.forEach((e: CalendarEvent) => {
              calendarEvents.push({
                ...e,
                date: new Date(e.date),
                source: "custom",
              });
            });
          } catch (err) {
            console.error("Failed to parse saved events:", err);
          }
        }

        if (tasksRes.success && tasksRes.data) {
          const tasks = tasksRes.data as Array<{
            id: string;
            title: string;
            dueDate?: string;
            priority?: string;
          }>;
          tasks.forEach((task) => {
            if (task.dueDate) {
              calendarEvents.push({
                id: task.id,
                title: task.title,
                date: new Date(task.dueDate),
                type: "task",
                priority: task.priority,
                source: "task",
              });
            }
          });
        }

        if (plansRes.success && plansRes.data) {
          const plans = plansRes.data as Array<{
            id: string;
            title: string;
            endDate?: string;
          }>;
          plans.forEach((plan) => {
            if (plan.endDate) {
              calendarEvents.push({
                id: plan.id,
                title: `${plan.title} Deadline`,
                date: new Date(plan.endDate),
                type: "deadline",
                source: "plan",
              });
            }
          });
        }

        setEvents(calendarEvents);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const selectedDateEvents = events.filter(
    (event) =>
      date &&
      event.date.toDateString() === date.toDateString()
  );

  const eventDates = events.map((e) => e.date.toDateString());

  const priorityColors: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-500 border-red-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    LOW: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    task: <Clock className="h-5 w-5 text-blue-500" />,
    deadline: <AlertTriangle className="h-5 w-5 text-red-500" />,
    study: <BookOpen className="h-5 w-5 text-green-500" />,
    custom: <Target className="h-5 w-5 text-purple-500" />,
  };

  const typeColors: Record<string, string> = {
    task: "border-l-blue-500",
    deadline: "border-l-red-500",
    study: "border-l-green-500",
    custom: "border-l-purple-500",
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !date) return;
    
    setSaving(true);
    
    try {
      const eventId = `custom-${Date.now()}`;
      const eventData: CalendarEvent = {
        id: eventId,
        title: newEvent.title,
        description: newEvent.description,
        date: date,
        type: newEvent.type,
        priority: newEvent.priority,
        source: "custom",
      };
      
      // If it's a task type, also create a task in the backend
      if (newEvent.type === "task") {
        const result = await tasksApi.create({
          title: newEvent.title,
          description: newEvent.description,
          dueDate: date.toISOString(),
          priority: newEvent.priority,
          status: "PENDING",
        });
        
        if (result.success && result.data) {
          eventData.id = (result.data as { id: string }).id;
          eventData.source = "task";
        }
      } else {
        // Save custom events to localStorage
        const savedEvents = localStorage.getItem("calendarEvents");
        const existing = savedEvents ? JSON.parse(savedEvents) : [];
        existing.push(eventData);
        localStorage.setItem("calendarEvents", JSON.stringify(existing));
      }
      
      setEvents((prev) => [...prev, eventData]);
      setShowAddDialog(false);
      setNewEvent({
        title: "",
        description: "",
        type: "task",
        priority: "MEDIUM",
      });
    } catch (error) {
      console.error("Failed to add event:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (event.source === "custom") {
      // Remove from localStorage
      const savedEvents = localStorage.getItem("calendarEvents");
      if (savedEvents) {
        const existing = JSON.parse(savedEvents);
        const filtered = existing.filter((e: CalendarEvent) => e.id !== event.id);
        localStorage.setItem("calendarEvents", JSON.stringify(filtered));
      }
    } else if (event.source === "task") {
      // Delete the task
      await tasksApi.delete(event.id);
    }
    
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
  };

  const openAddDialog = () => {
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            View and manage your study schedule
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  className="rounded-xl"
                  modifiers={{
                    hasEvent: (d) =>
                      eventDates.includes(d.toDateString()),
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: "bold",
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Events */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>
                  {date
                    ? date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a date"}
                </span>
                {date && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={openAddDialog}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors border-l-4 ${typeColors[event.type]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">{typeIcons[event.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {event.type}
                            </Badge>
                            {event.priority && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${priorityColors[event.priority]}`}
                              >
                                {event.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {(event.source === "custom" || event.source === "task") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEvent(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No events scheduled for this day</p>
                  <Button 
                    variant="link" 
                    onClick={openAddDialog}
                    className="mt-2"
                  >
                    Add an event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events
                .filter((e) => e.date >= new Date())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <div className="flex-shrink-0">{typeIcons[event.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              {events.filter((e) => e.date >= new Date()).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming events
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Create a new event for {date?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Add a description..."
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {["task", "study", "deadline", "custom"].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setNewEvent((prev) => ({
                        ...prev,
                        type: type as typeof prev.type,
                      }))
                    }
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors border ${
                      newEvent.type === type
                        ? "bg-primary/10 border-primary"
                        : "bg-muted border-transparent hover:bg-muted/80"
                    }`}
                  >
                    {typeIcons[type]}
                    <span className="text-xs capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {["LOW", "MEDIUM", "HIGH"].map((priority) => (
                  <button
                    key={priority}
                    onClick={() =>
                      setNewEvent((prev) => ({ ...prev, priority }))
                    }
                    className={`p-2 rounded-lg text-sm font-medium transition-colors border ${
                      newEvent.priority === priority
                        ? `${priorityColors[priority]} border-current`
                        : "bg-muted border-transparent hover:bg-muted/80"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEvent} 
              disabled={!newEvent.title.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Add Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
