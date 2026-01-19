"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Bell,
  Clock,
  Palette,
  Shield,
  CreditCard,
  Loader2,
  Save,
  Check,
  Crown,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { userApi, timerApi } from "@/lib/api";

interface UserPreferences {
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  pomodoroLength: number;
  shortBreakLength: number;
  longBreakLength: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    school: "",
    grade: "",
    bio: "",
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: true,
    dailyGoalMinutes: 120,
    weeklyGoalMinutes: 1200,
    pomodoroLength: 25,
    shortBreakLength: 5,
    longBreakLength: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
    notificationsEnabled: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        const [prefsResult, timerResult] = await Promise.all([
          userApi.getPreferences(user.id),
          timerApi.getSettings(),
        ]);

        setProfile({
          name: user.name || "",
          email: user.email || "",
          school: (user as { school?: string }).school || "",
          grade: (user as { grade?: string }).grade || "",
          bio: "",
        });

        if (prefsResult.success && prefsResult.data) {
          const prefs = prefsResult.data as Partial<UserPreferences>;
          setPreferences(prev => ({ ...prev, ...prefs }));
        }

        if (timerResult.success && timerResult.data) {
          const timer = timerResult.data as Partial<UserPreferences>;
          setPreferences(prev => ({
            ...prev,
            pomodoroLength: timer.pomodoroLength || prev.pomodoroLength,
            shortBreakLength: timer.shortBreakLength || prev.shortBreakLength,
            longBreakLength: timer.longBreakLength || prev.longBreakLength,
            longBreakInterval: timer.longBreakInterval || prev.longBreakInterval,
            autoStartBreaks: timer.autoStartBreaks ?? prev.autoStartBreaks,
            autoStartPomodoros: timer.autoStartPomodoros ?? prev.autoStartPomodoros,
            soundEnabled: timer.soundEnabled ?? prev.soundEnabled,
            notificationsEnabled: timer.notificationsEnabled ?? prev.notificationsEnabled,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await userApi.updateProfile(user.id, {
        name: profile.name,
        school: profile.school,
        grade: profile.grade,
        bio: profile.bio,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await Promise.all([
        userApi.updatePreferences(user.id, {
          theme: preferences.theme,
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          weeklyReport: preferences.weeklyReport,
          dailyGoalMinutes: preferences.dailyGoalMinutes,
          weeklyGoalMinutes: preferences.weeklyGoalMinutes,
        }),
        timerApi.updateSettings({
          pomodoroLength: preferences.pomodoroLength,
          shortBreakLength: preferences.shortBreakLength,
          longBreakLength: preferences.longBreakLength,
          longBreakInterval: preferences.longBreakInterval,
          autoStartBreaks: preferences.autoStartBreaks,
          autoStartPomodoros: preferences.autoStartPomodoros,
          soundEnabled: preferences.soundEnabled,
          notificationsEnabled: preferences.notificationsEnabled,
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="timer" className="gap-2">
            <Clock className="h-4 w-4" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Plan
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and public profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">School/University</label>
                    <Input
                      value={profile.school}
                      onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                      placeholder="Your school"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade/Year</label>
                    <Input
                      value={profile.grade}
                      onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                      placeholder="e.g., Junior, Senior"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Timer Tab */}
        <TabsContent value="timer">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Pomodoro Settings</CardTitle>
                <CardDescription>
                  Customize your focus timer durations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Focus Duration</label>
                      <span className="text-sm text-muted-foreground">{preferences.pomodoroLength} min</span>
                    </div>
                    <Slider
                      value={[preferences.pomodoroLength]}
                      onValueChange={([value]) => setPreferences({ ...preferences, pomodoroLength: value })}
                      min={5}
                      max={60}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Short Break</label>
                      <span className="text-sm text-muted-foreground">{preferences.shortBreakLength} min</span>
                    </div>
                    <Slider
                      value={[preferences.shortBreakLength]}
                      onValueChange={([value]) => setPreferences({ ...preferences, shortBreakLength: value })}
                      min={1}
                      max={15}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Long Break</label>
                      <span className="text-sm text-muted-foreground">{preferences.longBreakLength} min</span>
                    </div>
                    <Slider
                      value={[preferences.longBreakLength]}
                      onValueChange={([value]) => setPreferences({ ...preferences, longBreakLength: value })}
                      min={5}
                      max={30}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Long Break After</label>
                      <span className="text-sm text-muted-foreground">{preferences.longBreakInterval} sessions</span>
                    </div>
                    <Slider
                      value={[preferences.longBreakInterval]}
                      onValueChange={([value]) => setPreferences({ ...preferences, longBreakInterval: value })}
                      min={2}
                      max={8}
                      step={1}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-start Breaks</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically start breaks after focus sessions
                      </p>
                    </div>
                    <Switch
                      checked={preferences.autoStartBreaks}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, autoStartBreaks: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-start Focus</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically start focus sessions after breaks
                      </p>
                    </div>
                    <Switch
                      checked={preferences.autoStartPomodoros}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, autoStartPomodoros: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sound Effects</p>
                      <p className="text-sm text-muted-foreground">
                        Play sounds when timer completes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.soundEnabled}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, soundEnabled: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePreferences} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saved ? "Saved!" : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Study Goals</CardTitle>
                <CardDescription>
                  Set your daily and weekly study targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Daily Goal</label>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(preferences.dailyGoalMinutes / 60)}h {preferences.dailyGoalMinutes % 60}m
                    </span>
                  </div>
                  <Slider
                    value={[preferences.dailyGoalMinutes]}
                    onValueChange={([value]) => setPreferences({ ...preferences, dailyGoalMinutes: value })}
                    min={30}
                    max={480}
                    step={30}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Weekly Goal</label>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(preferences.weeklyGoalMinutes / 60)}h
                    </span>
                  </div>
                  <Slider
                    value={[preferences.weeklyGoalMinutes]}
                    onValueChange={([value]) => setPreferences({ ...preferences, weeklyGoalMinutes: value })}
                    min={300}
                    max={3000}
                    step={60}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates and reminders via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive browser notifications for timers
                      </p>
                    </div>
                    <Switch
                      checked={preferences.pushNotifications}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, pushNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Report</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly summary of your progress
                      </p>
                    </div>
                    <Switch
                      checked={preferences.weeklyReport}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, weeklyReport: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Timer Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when timer completes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notificationsEnabled}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, notificationsEnabled: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePreferences} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saved ? "Saved!" : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant="secondary" className="ml-2">
                    {user?.plan || "FREE"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user?.plan === "PRO" ? "Pro Plan" : user?.plan === "TEAM" ? "Team Plan" : "Free Plan"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.plan === "FREE" 
                          ? "Basic features with limited study plans"
                          : "Full access to all features"}
                      </p>
                    </div>
                    {user?.plan === "FREE" && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                        Upgrade
                      </Badge>
                    )}
                  </div>
                </div>

                {user?.plan === "FREE" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-2 border-primary relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl">
                        Popular
                      </div>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-primary" />
                          Pro
                        </CardTitle>
                        <div className="text-3xl font-bold">
                          $9<span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Unlimited study plans
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            AI-powered scheduling
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Advanced analytics
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Priority support
                          </li>
                        </ul>
                        <Button className="w-full mt-4">Upgrade to Pro</Button>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Team
                        </CardTitle>
                        <div className="text-3xl font-bold">
                          $19<span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Everything in Pro
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Team collaboration
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Shared study plans
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Admin dashboard
                          </li>
                        </ul>
                        <Button variant="outline" className="w-full mt-4">Choose Team</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
