"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Shield,
  LayoutDashboard,
  Users,
  LogOut,
  ArrowLeft,
  CreditCard,
} from "lucide-react";

const sidebarItems = [
  {
    title: "Admin",
    items: [
      { icon: LayoutDashboard, label: "Overview", href: "/admin" },
      { icon: Users, label: "Users", href: "/admin/users" },
      { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full w-64 border-r border-border/50 bg-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-red-500 to-orange-600 p-2 rounded-xl">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">Admin Panel</span>
        </Link>
      </div>

      {/* Back to App */}
      <div className="px-4 pt-4">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full justify-start gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </div>

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
                            "bg-red-500/10 text-red-500 hover:bg-red-500/15 hover:text-red-500"
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

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
