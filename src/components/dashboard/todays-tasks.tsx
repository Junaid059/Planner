"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MoreHorizontal,
  Clock,
  Flag,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tasksApi } from "@/lib/api";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

const priorityColors = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Physics: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  History: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Spanish: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  English: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export function TodaysTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await tasksApi.list({
          status: 'PENDING',
          limit: 10,
        });

        if (response.success && response.data) {
          const taskData = response.data as Task[];
          setTasks(taskData);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    try {
      const response = await tasksApi.update(taskId, { status: newStatus });
      if (response.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const formatDueTime = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';
    const date = new Date(dueDate);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Today&apos;s Tasks</CardTitle>
            <Badge variant="secondary" className="font-normal">
              {completedCount}/{tasks.length} done
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/tasks">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
            <Link href="/dashboard/tasks">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <p>No tasks for today</p>
                <Link href="/dashboard/tasks">
                  <Button variant="link" className="mt-2">
                    Create your first task
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`group flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all ${
                      task.status === 'COMPLETED' ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={task.status === 'COMPLETED'}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-medium text-sm ${
                            task.status === 'COMPLETED' ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${subjectColors[task.subject] || subjectColors.default}`}
                        >
                          {task.subject || 'General'}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDueTime(task.dueDate)}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${priorityColors[task.priority]}`}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {task.priority.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Change Priority</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}

                {completedTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Completed</p>
                    {completedTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="group flex items-start gap-3 p-3 rounded-lg"
                      >
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="mt-1"
                        />
                        <span className="font-medium text-sm line-through text-muted-foreground">
                          {task.title}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
