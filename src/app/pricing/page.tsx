"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  X,
  Sparkles,
  Users,
  Zap,
  Crown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { paymentsApi } from "@/lib/api";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Zap,
    color: "bg-gray-500",
    features: [
      { text: "3 Study Plans", included: true },
      { text: "30 Tasks", included: true },
      { text: "3 Flashcard Decks", included: true },
      { text: "100 Flashcards total", included: true },
      { text: "5 Notes", included: true },
      { text: "Basic Analytics", included: true },
      { text: "Unlimited Focus Sessions", included: true },
      { text: "AI Suggestions", included: false },
      { text: "AI Schedule Generation", included: false },
      { text: "Team Collaboration", included: false },
      { text: "Priority Support", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    description: "For serious learners",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    icon: Sparkles,
    color: "bg-purple-500",
    features: [
      { text: "50 Study Plans", included: true },
      { text: "500 Tasks", included: true },
      { text: "25 Flashcard Decks", included: true },
      { text: "1,000 Flashcards total", included: true },
      { text: "50 Notes", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Unlimited Focus Sessions", included: true },
      { text: "AI Suggestions (10/day)", included: true },
      { text: "AI Schedule Generation (5/day)", included: true },
      { text: "Team Collaboration", included: false },
      { text: "Priority Support", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Team",
    description: "For study groups & teams",
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    icon: Users,
    color: "bg-blue-500",
    features: [
      { text: "Unlimited Study Plans", included: true },
      { text: "Unlimited Tasks", included: true },
      { text: "Unlimited Flashcard Decks", included: true },
      { text: "Unlimited Flashcards", included: true },
      { text: "Unlimited Notes", included: true },
      { text: "Team Analytics Dashboard", included: true },
      { text: "Unlimited Focus Sessions", included: true },
      { text: "Unlimited AI Suggestions", included: true },
      { text: "Unlimited AI Generation", included: true },
      { text: "Team Collaboration", included: true },
      { text: "Priority Support", included: true },
    ],
    cta: "Start Team Plan",
    popular: false,
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubscribe = async (planName: string, billing: "monthly" | "yearly") => {
    if (!user) {
      // Redirect to login with return URL
      window.location.href = `/login?redirect=/pricing`;
      return;
    }

    if (planName === "Free") {
      window.location.href = "/dashboard";
      return;
    }

    setLoadingPlan(planName);
    try {
      const result = await paymentsApi.createCheckoutSession({
        plan: planName.toUpperCase() as "PRO" | "TEAM",
        interval: billing,
      });
      
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        alert("Failed to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            StudyFlow
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose the perfect plan for your{" "}
            <span className="text-primary">learning journey</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free and upgrade as you grow. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                Save 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const isCurrentPlan = user?.plan === plan.name.toUpperCase();
            const Icon = plan.icon;

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className={`w-12 h-12 rounded-xl ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${price.toFixed(2)}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{isYearly ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full gap-2"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrentPlan || loadingPlan === plan.name}
                    onClick={() => handleSubscribe(plan.name, isYearly ? "yearly" : "monthly")}
                  >
                    {loadingPlan === plan.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. When upgrading,
                  you&apos;ll be charged the prorated difference. When downgrading, you&apos;ll
                  receive credit towards your next billing cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens when I reach my limits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You&apos;ll receive a notification when you&apos;re approaching your limits.
                  Once reached, you won&apos;t be able to create new items until you upgrade
                  or delete existing ones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! All paid plans come with a 14-day free trial. You won&apos;t be charged
                  until the trial ends, and you can cancel anytime during the trial period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does team collaboration work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  With the Team plan, you can invite others to join your study team. Team
                  members can share study plans, flashcard decks, and track progress together.
                  The team owner manages billing for all members.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold mb-4">Ready to supercharge your learning?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of students who are achieving their goals with StudyFlow.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Start Your Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
