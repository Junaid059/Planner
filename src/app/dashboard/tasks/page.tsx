"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  Clock,
  Flag,
  ListTodo,
  Loader2,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { tasksApi } from "@/lib/api";

interface Task {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  dueDate?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  estimatedMinutes?: number;
  subtasks?: { title: string; completed: boolean }[];
}

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
};

const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Physics: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  History: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Spanish: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  English: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Chemistry: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    subject: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: string;
    estimatedMinutes: number;
  }>({
    title: "",
    description: "",
    subject: "",
    priority: "MEDIUM",
    dueDate: "",
    estimatedMinutes: 30,
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.list();
      if (response.success && response.data) {
        setTasks(response.data as Task[]);
      }
    } catch (err) {
      setError("Failed to load tasks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      setCreating(true);
      const response = await tasksApi.create({
        title: newTask.title,
        description: newTask.description,
        subject: newTask.subject,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        estimatedMinutes: newTask.estimatedMinutes,
      });
      
      if (response.success && response.data) {
        setTasks((prev) => [response.data as Task, ...prev]);
        setNewTask({ title: "", description: "", subject: "", priority: "MEDIUM", dueDate: "", estimatedMinutes: 30 });
        setIsCreateOpen(false);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );
    
    try {
      await tasksApi.update(taskId, { status: newStatus });
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: task.status } : t
        )
      );
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const incompleteTasks = filteredTasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED");

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <ListTodo className="h-6 w-6" />
            Tasks
          </h1>
          <p className="text-muted-foreground">
            Manage and track all your study tasks
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={newTask.subject}
                    onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT" })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Est. Minutes</label>
                  <Input
                    type="number"
                    value={newTask.estimatedMinutes}
                    onChange={(e) => setNewTask({ ...newTask, estimatedMinutes: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <Button onClick={handleCreateTask} disabled={creating || !newTask.title.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="h-5 px-1.5">
              {filteredTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            <Badge variant="secondary" className="h-5 px-1.5">
              {incompleteTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            Completed
            <Badge variant="secondary" className="h-5 px-1.5">
              {completedTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No tasks found. Create one to get started!
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onToggle={handleToggleTask}
                onDelete={handleDeleteTask}
                formatDate={formatDate}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {incompleteTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              formatDate={formatDate}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              formatDate={formatDate}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskCard({
  task,
  index,
  onToggle,
  onDelete,
  formatDate,
}: {
  task: Task;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  formatDate: (date?: string) => string;
}) {
  const isCompleted = task.status === "COMPLETED";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`border-border/50 hover:shadow-md transition-all ${isCompleted ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => onToggle(task.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`font-semibold ${isCompleted ? "line-through" : ""}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onToggle(task.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {task.subject && (
                  <Badge variant="secondary" className={subjectColors[task.subject] || subjectColors.default}>
                    {task.subject}
                  </Badge>
                )}
                <Badge variant="outline" className={priorityColors[task.priority]}>
                  <Flag className="h-3 w-3 mr-1" />
                  {task.priority.toLowerCase()}
                </Badge>
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                  </div>
                )}
                {task.estimatedMinutes && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {task.estimatedMinutes}m
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
