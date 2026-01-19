// Stripe Webhook Handler
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Subscription, Payment } from '@/lib/db/models';
import { stripe, STRIPE_WEBHOOK_SECRET, mapStripeStatus, getPlanFromPriceId } from '@/lib/stripe';
import Stripe from 'stripe';

// Disable body parsing for webhooks
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const db = await getDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(db, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(db, subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(db, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(db, invoice);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        // You can send a notification to the user here
        console.log('Trial ending soon for:', subscription.metadata.userId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(db: Awaited<ReturnType<typeof getDb>>, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  
  // Get period dates from subscription items
  const currentPeriodStart = stripeSubscription.items.data[0]?.current_period_start 
    ? new Date(stripeSubscription.items.data[0].current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end
    ? new Date(stripeSubscription.items.data[0].current_period_end * 1000)
    : new Date();

  // Update or create subscription in database
  await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
    { userId: toObjectId(userId) },
    {
      $set: {
        plan,
        status: mapStripeStatus(stripeSubscription.status) as Subscription['status'],
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : undefined,
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : undefined,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId: toObjectId(userId),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // Update user's plan
  await db.collection<User>(COLLECTIONS.USERS).updateOne(
    { _id: toObjectId(userId) },
    {
      $set: {
        plan,
        updatedAt: new Date(),
      },
    }
  );

  // Log activity
  await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
    userId: toObjectId(userId),
    action: 'subscription_created',
    entityType: 'subscription',
    details: { plan, subscriptionId },
    createdAt: new Date(),
  });
}

async function handleSubscriptionUpdate(db: Awaited<ReturnType<typeof getDb>>, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to find user by customer ID
    const existingSub = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).findOne({
      stripeSubscriptionId: subscription.id,
    });
    if (!existingSub) {
      console.error('No userId found for subscription update');
      return;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapStripeStatus(subscription.status) as Subscription['status'];
  
  // Get period dates from subscription items
  const currentPeriodStart = subscription.items.data[0]?.current_period_start 
    ? new Date(subscription.items.data[0].current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000)
    : new Date();

  // Update subscription
  const updateResult = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      $set: {
        plan,
        status,
        stripePriceId: priceId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  // Update user's plan if subscription is active
  if (updateResult && ['ACTIVE', 'TRIALING'].includes(status)) {
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: updateResult.userId },
      {
        $set: {
          plan,
          updatedAt: new Date(),
        },
      }
    );
  }
}

async function handleSubscriptionDeleted(db: Awaited<ReturnType<typeof getDb>>, subscription: Stripe.Subscription) {
  // Update subscription status
  const updateResult = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      $set: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  // Downgrade user to FREE plan
  if (updateResult) {
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: updateResult.userId },
      {
        $set: {
          plan: 'FREE',
          updatedAt: new Date(),
        },
      }
    );

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: updateResult.userId,
      action: 'subscription_canceled',
      entityType: 'subscription',
      details: { previousPlan: updateResult.plan },
      createdAt: new Date(),
    });
  }
}

async function handleInvoicePaid(db: Awaited<ReturnType<typeof getDb>>, invoice: Stripe.Invoice) {
  // Cast to any to access properties that may vary by Stripe API version
  const invoiceData = invoice as unknown as {
    subscription?: string;
    payment_intent?: string;
    amount_paid: number;
    currency: string;
    number?: string | null;
    period_start?: number;
    period_end?: number;
    id: string;
  };
  
  if (!invoiceData.subscription) return;

  // Find the subscription
  const subscription = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).findOne({
    stripeSubscriptionId: invoiceData.subscription,
  });

  if (!subscription) return;

  // Record the payment
  await db.collection<Payment>(COLLECTIONS.PAYMENTS).insertOne({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    stripePaymentIntentId: invoiceData.payment_intent || '',
    stripeInvoiceId: invoiceData.id,
    amount: invoiceData.amount_paid / 100,
    currency: invoiceData.currency,
    status: 'SUCCEEDED',
    description: `Subscription payment - ${subscription.plan}`,
    metadata: {
      invoiceNumber: invoiceData.number,
      periodStart: invoiceData.period_start,
      periodEnd: invoiceData.period_end,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update subscription status if needed
  if (subscription.status === 'PAST_DUE') {
    await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
      { _id: subscription._id },
      {
        $set: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      }
    );
  }
}

async function handleInvoiceFailed(db: Awaited<ReturnType<typeof getDb>>, invoice: Stripe.Invoice) {
  // Cast to any to access properties that may vary by Stripe API version
  const invoiceData = invoice as unknown as {
    subscription?: string;
    payment_intent?: string;
    amount_due: number;
    currency: string;
    id: string;
  };
  
  if (!invoiceData.subscription) return;

  // Find the subscription
  const subscription = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).findOne({
    stripeSubscriptionId: invoiceData.subscription,
  });

  if (!subscription) return;

  // Record the failed payment
  await db.collection<Payment>(COLLECTIONS.PAYMENTS).insertOne({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    stripePaymentIntentId: invoiceData.payment_intent || '',
    stripeInvoiceId: invoiceData.id,
    amount: invoiceData.amount_due / 100,
    currency: invoiceData.currency,
    status: 'FAILED',
    description: `Failed payment - ${subscription.plan}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update subscription status
  await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
    { _id: subscription._id },
    {
      $set: {
        status: 'PAST_DUE',
        updatedAt: new Date(),
      },
    }
  );

  // Log activity
  await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
    userId: subscription.userId,
    action: 'payment_failed',
    entityType: 'payment',
    details: { invoiceId: invoice.id, amount: invoice.amount_due / 100 },
    createdAt: new Date(),
  });
}
