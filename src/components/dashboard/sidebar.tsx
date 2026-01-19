"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import {
  BookOpen,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Timer,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  FolderKanban,
  Brain,
  Shield,
  CreditCard,
  Users,
} from "lucide-react";

const sidebarItems = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: Calendar, label: "Calendar", href: "/dashboard/calendar" },
    ],
  },
  {
    title: "Study",
    items: [
      { icon: FolderKanban, label: "Study Plans", href: "/dashboard/plans" },
      { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
      { icon: Timer, label: "Focus Timer", href: "/dashboard/timer" },
      { icon: Brain, label: "Flashcards", href: "/dashboard/flashcards" },
    ],
  },
  {
    title: "Progress",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
      { icon: FileText, label: "Notes", href: "/dashboard/notes" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: Users, label: "Teams", href: "/dashboard/teams" },
      { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full w-64 border-r border-border/50 bg-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-primary to-purple-600 p-2 rounded-xl">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">StudyFlow</span>
        </Link>
      </div>

      {/* Admin Link */}
      {user?.role === 'ADMIN' && (
        <div className="px-4 pt-4">
          <Link href="/admin">
            <Button variant="outline" className="w-full justify-start gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500">
              <Shield className="h-4 w-4" />
              Admin Panel
            </Button>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-6">
          {sidebarItems.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-10",
                          isActive &&
                            "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Upgrade Banner - Show only for FREE users */}
      {user?.plan === 'FREE' && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Get unlimited plans, AI features & more
            </p>
            <Link href="/pricing">
              <Button size="sm" className="w-full">
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
