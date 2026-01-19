"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2 } from "lucide-react";

export function QuickTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");

  const totalTime = mode === "focus" ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Could add notification here
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: "focus" | "break") => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === "focus" ? 25 * 60 : 5 * 60);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Focus Timer</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "focus" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => switchMode("focus")}
          >
            <Brain className="h-4 w-4" />
            Focus
          </Button>
          <Button
            variant={mode === "break" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => switchMode("break")}
          >
            <Coffee className="h-4 w-4" />
            Break
          </Button>
        </div>

        {/* Timer Display */}
        <div className="flex justify-center">
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#timerGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${2 * Math.PI * 70}` }}
                animate={{
                  strokeDasharray: `${(progress / 100) * 2 * Math.PI * 70} ${2 * Math.PI * 70}`,
                }}
                transition={{ duration: 0.5 }}
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={mode === "focus" ? "oklch(0.55 0.25 280)" : "oklch(0.6 0.2 150)"} />
                  <stop offset="100%" stopColor={mode === "focus" ? "oklch(0.65 0.22 320)" : "oklch(0.65 0.15 180)"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-bold font-mono">
                {formatTime(timeLeft)}
              </span>
              <Badge variant="secondary" className="mt-2">
                {mode === "focus" ? "Focus Time" : "Break Time"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={resetTimer}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            className="w-24 gap-2"
            onClick={toggleTimer}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Session Counter */}
        <div className="text-center text-sm text-muted-foreground">
          Sessions completed today: <span className="font-semibold text-foreground">4</span>
        </div>
      </CardContent>
    </Card>
  );
}
