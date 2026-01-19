// Stripe Configuration and Utilities
import Stripe from 'stripe';

// Initialize Stripe with API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Stripe Price IDs (configure these in your Stripe dashboard)
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
  TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
};

// Webhook secret for verifying Stripe events
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Helper to create a Stripe checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
  trialDays = 0,
  metadata = {},
}: {
  customerId?: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      ...metadata,
    },
    subscription_data: {
      metadata: {
        userId,
        ...metadata,
      },
      ...(trialDays > 0 && { trial_period_days: trialDays }),
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_creation = 'always';
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// Helper to create a customer portal session
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Helper to create or get a Stripe customer
export async function createOrGetCustomer({
  email,
  name,
  userId,
  existingCustomerId,
}: {
  email: string;
  name: string;
  userId: string;
  existingCustomerId?: string;
}) {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Check if customer exists by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    // Update existing customer with userId metadata
    return stripe.customers.update(existingCustomers.data[0].id, {
      metadata: { userId },
    });
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });
}

// Helper to cancel a subscription
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Helper to resume a canceled subscription
export async function resumeSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Helper to update subscription plan
export async function updateSubscriptionPlan({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string;
  newPriceId: string;
}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// Helper to get subscription details
export async function getSubscriptionDetails(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'default_payment_method'],
  });
}

// Helper to get payment methods for a customer
export async function getPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
}

// Helper to set default payment method
export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// Helper to get invoice history
export async function getInvoiceHistory(customerId: string, limit = 10) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

// Map Stripe subscription status to our status
export function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    canceled: 'CANCELED',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'EXPIRED',
    past_due: 'PAST_DUE',
    trialing: 'TRIALING',
    unpaid: 'PAST_DUE',
    paused: 'CANCELED',
  };
  return statusMap[status] || 'ACTIVE';
}

// Get plan from price ID
export function getPlanFromPriceId(priceId: string): 'FREE' | 'PRO' | 'TEAM' {
  if (priceId === STRIPE_PRICES.PRO_MONTHLY || priceId === STRIPE_PRICES.PRO_YEARLY) {
    return 'PRO';
  }
  if (priceId === STRIPE_PRICES.TEAM_MONTHLY || priceId === STRIPE_PRICES.TEAM_YEARLY) {
    return 'TEAM';
  }
  return 'FREE';
}
