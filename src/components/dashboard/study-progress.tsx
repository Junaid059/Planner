"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { analyticsApi } from "@/lib/api";

interface SubjectProgress {
  name: string;
  hours: number;
  total: number;
  color: string;
}

const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-500",
  Physics: "bg-purple-500",
  Chemistry: "bg-green-500",
  English: "bg-orange-500",
  History: "bg-pink-500",
  default: "bg-violet-500",
};

export function StudyProgress() {
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [targetHours, setTargetHours] = useState(27); // Default weekly target
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await analyticsApi.get({ period: 'week' });
        
        if (response.success && response.data) {
          const data = response.data as {
            overview: { totalStudyHours: number };
            plans?: Array<{ title: string; progress: number }>;
            distribution?: {
              byPlan?: Array<{ planId: string; hours: number }>;
            };
          };
          
          const hours = data.overview?.totalStudyHours || 0;
          setTotalHours(hours);
          
          // If we have plan distribution, use it to build subjects
          if (data.plans && data.plans.length > 0) {
            const subjectData = data.plans.slice(0, 5).map((plan, index) => ({
              name: plan.title || `Subject ${index + 1}`,
              hours: Math.round((hours * (plan.progress || 0) / 100) * 10) / 10,
              total: Math.ceil(hours / data.plans!.length),
              color: Object.values(subjectColors)[index] || subjectColors.default,
            }));
            setSubjects(subjectData);
            setTargetHours(subjectData.reduce((acc, s) => acc + s.total, 0) || 27);
          } else {
            // Default display when no data
            setSubjects([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50 h-full">
        <CardContent className="p-6 flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const progressPercent = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Weekly Study Progress</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {totalHours.toFixed(1)} / {targetHours}hrs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Progress */}
        <div className="flex justify-center">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56 * (progressPercent / 100)} ${2 * Math.PI * 56}`}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(0.55 0.25 280)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 320)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-3xl font-bold">
                {Math.round(progressPercent)}%
              </span>
              <span className="text-xs text-muted-foreground">Complete</span>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        {subjects.length > 0 ? (
          <div className="space-y-3">
            {subjects.map((subject) => (
              <div key={subject.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{subject.name}</span>
                  <span className="text-muted-foreground">
                    {subject.hours}h / {subject.total}h
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${subject.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, (subject.hours / subject.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>Start studying to see your progress breakdown!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
