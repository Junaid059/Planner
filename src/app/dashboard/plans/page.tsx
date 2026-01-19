"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FolderKanban,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  Trash2,
  Edit,
  Archive,
  ExternalLink,
} from "lucide-react";
import { plansApi } from "@/lib/api";

interface StudyPlan {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  progress: number;
  status: string;
  color: string | null;
  icon: string | null;
  startDate: string | null;
  endDate: string | null;
  _count?: {
    tasks: number;
    goals: number;
  };
  tasks?: { status: string }[];
}

const colorOptions = [
  { name: "Blue", value: "from-blue-500 to-cyan-500" },
  { name: "Purple", value: "from-purple-500 to-pink-500" },
  { name: "Orange", value: "from-orange-500 to-red-500" },
  { name: "Green", value: "from-green-500 to-emerald-500" },
  { name: "Pink", value: "from-pink-500 to-rose-500" },
  { name: "Amber", value: "from-amber-500 to-orange-500" },
];

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: "",
    description: "",
    subject: "",
    color: colorOptions[0].value,
    startDate: "",
    endDate: "",
  });

  const fetchPlans = async () => {
    try {
      const result = await plansApi.list({ status: "ACTIVE", limit: 50 });
      if (result.success && result.data) {
        setPlans(result.data as StudyPlan[]);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlan.title.trim()) return;
    
    setCreating(true);
    try {
      const result = await plansApi.create({
        title: newPlan.title,
        description: newPlan.description || undefined,
        subject: newPlan.subject || undefined,
        color: newPlan.color,
        startDate: newPlan.startDate || undefined,
        endDate: newPlan.endDate || undefined,
      });

      if (result.success) {
        setShowCreateDialog(false);
        setNewPlan({
          title: "",
          description: "",
          subject: "",
          color: colorOptions[0].value,
          startDate: "",
          endDate: "",
        });
        fetchPlans();
      }
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const result = await plansApi.delete(id);
      if (result.success) {
        setPlans(plans.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const handleArchivePlan = async (id: string) => {
    try {
      const result = await plansApi.update(id, { status: "ARCHIVED" });
      if (result.success) {
        setPlans(plans.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to archive plan:", error);
    }
  };

  // Calculate stats
  const totalPlans = plans.length;
  const avgProgress = plans.length > 0 
    ? Math.round(plans.reduce((sum, p) => sum + p.progress, 0) / plans.length)
    : 0;
  const dueThisWeek = plans.filter(p => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return end <= weekFromNow && end >= new Date();
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <FolderKanban className="h-6 w-6" />
            Study Plans
          </h1>
          <p className="text-muted-foreground">
            Organize your learning with structured study plans
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Study Plan</DialogTitle>
              <DialogDescription>
                Create a new study plan to organize your learning goals.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="e.g., Final Exam Prep - Mathematics"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe your study plan..."
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="e.g., Mathematics"
                    value={newPlan.subject}
                    onChange={(e) => setNewPlan({ ...newPlan, subject: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewPlan({ ...newPlan, color: color.value })}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.value} ${
                          newPlan.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={newPlan.startDate}
                    onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={newPlan.endDate}
                    onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={creating || !newPlan.title.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Plan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPlans}</p>
              <p className="text-sm text-muted-foreground">Active Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgProgress}%</p>
              <p className="text-sm text-muted-foreground">Avg. Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueThisWeek}</p>
              <p className="text-sm text-muted-foreground">Due This Week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                className="border-border/50 hover:shadow-lg transition-all cursor-pointer group h-full"
                onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${plan.color || "from-blue-500 to-cyan-500"}`}
                    >
                      <FolderKanban className="h-5 w-5 text-white" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/plans/${plan.id}`); }}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchivePlan(plan.id); }}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="pt-3">
                    <CardTitle className="text-lg">{plan.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {plan.description || "No description"}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{plan.progress}%</span>
                    </div>
                    <Progress value={plan.progress} className="h-2" />
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {plan.subject && (
                      <Badge variant="secondary">{plan.subject}</Badge>
                    )}
                    {plan._count && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{plan._count.tasks} tasks</span>
                      </div>
                    )}
                    {plan.endDate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(plan.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add New Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: plans.length * 0.05 }}
        >
          <Card 
            className="border-dashed border-2 border-border hover:border-primary/50 transition-colors cursor-pointer h-full min-h-[280px] flex items-center justify-center"
            onClick={() => setShowCreateDialog(true)}
          >
            <CardContent className="text-center">
              <div className="p-4 rounded-full bg-muted mx-auto w-fit mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold">Create New Plan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start organizing your studies
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
