// Payment API Routes - Stripe Integration
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Subscription, Payment } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';
import {
  stripe,
  STRIPE_PRICES,
  createCheckoutSession,
  createCustomerPortalSession,
  createOrGetCustomer,
  cancelSubscription,
  resumeSubscription,
  getPaymentMethods,
  getInvoiceHistory,
  getSubscriptionDetails,
} from '@/lib/stripe';

// Verify user authentication
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const db = await getDb();
  const usersCollection = db.collection<User>(COLLECTIONS.USERS);
  const user = await usersCollection.findOne({ _id: toObjectId(payload.userId) });

  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  return { user, payload };
}

// GET /api/payments - Get user's payment info, subscription, and invoices
export async function GET(request: NextRequest) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { user } = userCheck;
    const db = await getDb();

    // Get user's subscription
    const subscription = await db
      .collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS)
      .findOne({ userId: user._id!, status: { $in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } });

    // Get payment history
    const payments = await db
      .collection<Payment>(COLLECTIONS.PAYMENTS)
      .find({ userId: user._id! })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Get Stripe data if customer exists
    let stripeData = null;
    if (subscription?.stripeCustomerId) {
      try {
        const [paymentMethods, invoices] = await Promise.all([
          getPaymentMethods(subscription.stripeCustomerId),
          getInvoiceHistory(subscription.stripeCustomerId),
        ]);

        stripeData = {
          paymentMethods: paymentMethods.data.map((pm) => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year,
            isDefault: pm.id === subscription.stripeSubscriptionId,
          })),
          invoices: invoices.data.map((inv) => ({
            id: inv.id,
            number: inv.number ?? undefined,
            amount: inv.amount_due / 100,
            currency: inv.currency,
            status: inv.status ?? undefined,
            paidAt: inv.status_transitions?.paid_at ?? undefined,
            invoicePdf: inv.invoice_pdf ?? undefined,
            hostedUrl: inv.hosted_invoice_url ?? undefined,
            createdAt: inv.created,
          })),
        };
      } catch (err) {
        console.error('Error fetching Stripe data:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscription
          ? {
              id: subscription._id?.toString(),
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              trialEnd: subscription.trialEnd,
            }
          : null,
        payments: payments.map((p) => ({
          id: p._id?.toString(),
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          description: p.description,
          createdAt: p.createdAt,
        })),
        stripeData,
        currentPlan: user.plan,
      },
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create checkout session for subscription
export async function POST(request: NextRequest) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { user } = userCheck;
    const body = await request.json();
    const { plan, interval = 'monthly' } = body;

    if (!plan || !['PRO', 'TEAM'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid plan' } },
        { status: 400 }
      );
    }

    // Get the price ID based on plan and interval
    let priceId: string;
    if (plan === 'PRO') {
      priceId = interval === 'yearly' ? STRIPE_PRICES.PRO_YEARLY : STRIPE_PRICES.PRO_MONTHLY;
    } else {
      priceId = interval === 'yearly' ? STRIPE_PRICES.TEAM_YEARLY : STRIPE_PRICES.TEAM_MONTHLY;
    }

    // Get or create Stripe customer
    const db = await getDb();
    const subscription = await db
      .collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS)
      .findOne({ userId: user._id! });

    const customer = await createOrGetCustomer({
      email: user.email,
      name: user.name,
      userId: user._id!.toString(),
      existingCustomerId: subscription?.stripeCustomerId,
    });

    // Update or create subscription record with customer ID
    await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
      { userId: user._id! },
      {
        $set: {
          stripeCustomerId: customer.id,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          userId: user._id!,
          plan: 'FREE',
          status: 'INCOMPLETE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      userId: user._id!.toString(),
      successUrl: `${baseUrl}/dashboard/settings?tab=billing&success=true`,
      cancelUrl: `${baseUrl}/dashboard/settings?tab=billing&canceled=true`,
      trialDays: user.plan === 'FREE' ? 7 : 0, // 7 day trial for new users
      metadata: { plan, interval },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/payments - Manage subscription (cancel, resume, update)
export async function PATCH(request: NextRequest) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { user } = userCheck;
    const body = await request.json();
    const { action } = body;

    const db = await getDb();
    const subscription = await db
      .collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS)
      .findOne({ userId: user._id!, status: { $in: ['ACTIVE', 'TRIALING'] } });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: { code: 'SUB001', message: 'No active subscription found' } },
        { status: 404 }
      );
    }

    let result;
    switch (action) {
      case 'cancel':
        result = await cancelSubscription(subscription.stripeSubscriptionId, false);
        await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
          { _id: subscription._id },
          {
            $set: {
              cancelAtPeriodEnd: true,
              canceledAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
        break;

      case 'resume':
        result = await resumeSubscription(subscription.stripeSubscriptionId);
        await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
          { _id: subscription._id },
          {
            $set: {
              cancelAtPeriodEnd: false,
              canceledAt: undefined,
              updatedAt: new Date(),
            },
            $unset: { canceledAt: '' },
          }
        );
        break;

      case 'portal':
        // Create customer portal session
        if (!subscription.stripeCustomerId) {
          return NextResponse.json(
            { success: false, error: { code: 'SUB002', message: 'No Stripe customer found' } },
            { status: 400 }
          );
        }
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const portalSession = await createCustomerPortalSession({
          customerId: subscription.stripeCustomerId,
          returnUrl: `${baseUrl}/dashboard/settings?tab=billing`,
        });
        return NextResponse.json({
          success: true,
          data: { url: portalSession.url },
        });

      default:
        return NextResponse.json(
          { success: false, error: { code: 'VAL001', message: 'Invalid action' } },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: { message: `Subscription ${action}ed successfully` },
    });
  } catch (error) {
    console.error('Manage subscription error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
