"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Payment Canceled</h1>
          <p className="text-muted-foreground mb-6">
            Your payment was not completed. No charges have been made to your account.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <HelpCircle className="h-5 w-5" />
              <span className="font-semibold">Need Help?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              If you experienced any issues during checkout, please contact our support team. 
              We&apos;re here to help!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/pricing">
              <Button className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Pricing
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
