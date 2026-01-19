"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { tasksApi } from "@/lib/api";

interface Event {
  id: string;
  title: string;
  time: string;
  color: string;
  day: number;
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
  default: "bg-blue-500",
};

export function UpcomingSchedule() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        // Fetch upcoming tasks with due dates
        const response = await tasksApi.list({
          status: 'PENDING',
          limit: 10,
        });

        if (response.success && response.data) {
          interface TaskData {
            id: string;
            title: string;
            dueDate: string | null;
            priority: string;
          }
          const tasks = response.data as TaskData[];
          
          // Convert tasks to events
          const eventList = tasks
            .filter((task) => task.dueDate)
            .map((task) => {
              const dueDate = new Date(task.dueDate!);
              return {
                id: task.id,
                title: task.title,
                time: dueDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                }),
                color: priorityColors[task.priority] || priorityColors.default,
                day: dueDate.getDate(),
              };
            });
          
          setEvents(eventList);
        }
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const today = currentDate.getDate();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days for current week
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({
        date: day.getDate(),
        isToday: day.getDate() === today && day.getMonth() === currentDate.getMonth(),
        hasEvents: events.some((e) => e.day === day.getDate()),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const upcomingEvents = events.filter((e) => e.day >= today).slice(0, 5);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center justify-center h-[350px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{currentMonth}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
          {weekDays.map((day, index) => (
            <button
              key={index}
              className={`
                relative p-2 text-sm rounded-lg transition-colors
                ${day.isToday
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
                }
              `}
            >
              {day.date}
              {day.hasEvents && !day.isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Upcoming Events */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Upcoming</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          <ScrollArea className="h-[180px]">
            {upcomingEvents.length === 0 ? (
              <div className="flex items-center justify-center h-[150px] text-sm text-muted-foreground">
                No upcoming events
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-1 h-full min-h-[40px] rounded-full ${event.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.time}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {currentDate.toLocaleDateString('en-US', { month: 'short' })} {event.day}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
