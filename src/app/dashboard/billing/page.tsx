"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  Crown,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Zap,
  Sparkles,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { paymentsApi, usageApi } from "@/lib/api";
import Link from "next/link";

interface PaymentInfo {
  subscription: {
    id: string;
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd?: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description?: string;
    createdAt: string;
  }>;
  stripeData: {
    paymentMethods: Array<{
      id: string;
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
    }>;
    invoices: Array<{
      id: string;
      number?: string;
      amount: number;
      currency: string;
      status?: string;
      paidAt?: number;
      invoicePdf?: string;
      hostedUrl?: string;
    }>;
  } | null;
  currentPlan: string;
}

interface UsageData {
  studyPlans: { used: number; limit: number; unlimited?: boolean; percentage?: number };
  tasks: { used: number; limit: number; unlimited?: boolean; percentage?: number };
  flashcardDecks: { used: number; limit: number; unlimited?: boolean; percentage?: number };
  notes: { used: number; limit: number; unlimited?: boolean; percentage?: number };
  aiSuggestions: { used: number; limit: number; unlimited?: boolean; percentage?: number; resetsIn?: string };
  aiScheduleGenerations: { used: number; limit: number; unlimited?: boolean; percentage?: number; resetsIn?: string };
}

const planIcons = {
  FREE: Zap,
  PRO: Sparkles,
  TEAM: Users,
};

const planColors = {
  FREE: "bg-gray-500",
  PRO: "bg-purple-500",
  TEAM: "bg-blue-500",
};

export default function BillingPage() {
  const { user } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentResult, usageResult] = await Promise.all([
          paymentsApi.getPaymentInfo(),
          usageApi.getUsageSummary(),
        ]);

        if (paymentResult.success) {
          setPaymentInfo(paymentResult.data as PaymentInfo);
        }
        if (usageResult.success) {
          setUsage(usageResult.data as UsageData);
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const result = await paymentsApi.openCustomerPortal();
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setManagingBilling(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.")) {
      return;
    }

    try {
      const result = await paymentsApi.cancelSubscription();
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const result = await paymentsApi.resumeSubscription();
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to resume subscription:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = user?.plan || "FREE";
  const PlanIcon = planIcons[currentPlan as keyof typeof planIcons] || Zap;
  const planColor = planColors[currentPlan as keyof typeof planColors] || "bg-gray-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${planColor}`}>
                <PlanIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentPlan} Plan
                  {paymentInfo?.subscription?.status === "ACTIVE" && (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                  {paymentInfo?.subscription?.status === "TRIALING" && (
                    <Badge className="bg-blue-500">Trial</Badge>
                  )}
                  {paymentInfo?.subscription?.cancelAtPeriodEnd && (
                    <Badge variant="destructive">Canceling</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentPlan === "FREE"
                    ? "You're on the free plan"
                    : paymentInfo?.subscription
                    ? `Renews on ${new Date(paymentInfo.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : "Subscription details unavailable"}
                </CardDescription>
              </div>
            </div>
            {currentPlan !== "FREE" && (
              <Button variant="outline" onClick={handleManageBilling} disabled={managingBilling}>
                {managingBilling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Manage Billing
              </Button>
            )}
          </div>
        </CardHeader>
        {paymentInfo?.subscription?.cancelAtPeriodEnd && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-500">Subscription Canceling</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription will end on{" "}
                    {new Date(paymentInfo.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button onClick={handleResumeSubscription}>
                Resume Subscription
              </Button>
            </div>
          </CardContent>
        )}
        <CardFooter className="flex gap-2">
          {currentPlan === "FREE" ? (
            <Link href="/pricing" className="flex-1">
              <Button className="w-full gap-2">
                <Crown className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
          ) : currentPlan === "PRO" ? (
            <>
              <Link href="/pricing" className="flex-1">
                <Button className="w-full gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Upgrade to Team
                </Button>
              </Link>
              {!paymentInfo?.subscription?.cancelAtPeriodEnd && (
                <Button variant="outline" onClick={handleCancelSubscription}>
                  Cancel Plan
                </Button>
              )}
            </>
          ) : !paymentInfo?.subscription?.cancelAtPeriodEnd ? (
            <Button variant="outline" onClick={handleCancelSubscription}>
              Cancel Plan
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      {/* Payment Method */}
      {paymentInfo?.stripeData?.paymentMethods && paymentInfo.stripeData.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-muted rounded">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium capitalize">
                  {paymentInfo.stripeData.paymentMethods[0].brand} •••• {paymentInfo.stripeData.paymentMethods[0].last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {paymentInfo.stripeData.paymentMethods[0].expMonth}/{paymentInfo.stripeData.paymentMethods[0].expYear}
                </p>
              </div>
              <Button variant="ghost" className="ml-auto" onClick={handleManageBilling}>
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage This Period</CardTitle>
            <CardDescription>
              Track your resource usage against your plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UsageItem
              label="Study Plans"
              used={usage.studyPlans.used}
              limit={usage.studyPlans.limit}
            />
            <UsageItem
              label="Tasks"
              used={usage.tasks.used}
              limit={usage.tasks.limit}
            />
            <UsageItem
              label="Flashcard Decks"
              used={usage.flashcardDecks.used}
              limit={usage.flashcardDecks.limit}
            />
            <UsageItem
              label="Notes"
              used={usage.notes.used}
              limit={usage.notes.limit}
            />
            {currentPlan !== "FREE" && (
              <>
                <UsageItem
                  label="AI Suggestions (Today)"
                  used={usage.aiSuggestions.used}
                  limit={usage.aiSuggestions.limit}
                />
                <UsageItem
                  label="AI Schedules (Today)"
                  used={usage.aiScheduleGenerations.used}
                  limit={usage.aiScheduleGenerations.limit}
                />
              </>
            )}
          </CardContent>
          {currentPlan === "FREE" && (
            <CardFooter>
              <div className="w-full p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Running low on limits? Upgrade for more resources and AI features.
                </p>
                <Link href="/pricing">
                  <Button variant="link" className="gap-1">
                    View Plans <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === "FREE" ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing history</p>
              <p className="text-sm">Upgrade to a paid plan to see invoices here</p>
            </div>
          ) : (
            <Button variant="outline" onClick={handleManageBilling} disabled={managingBilling}>
              {managingBilling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              View All Invoices
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageItem({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={`text-sm ${isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-muted-foreground"}`}>
          {used.toLocaleString()} / {isUnlimited ? "∞" : limit.toLocaleString()}
          {isAtLimit && <CheckCircle className="h-4 w-4 inline ml-1" />}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
        />
      )}
    </div>
  );
}
