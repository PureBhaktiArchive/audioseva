// To be named stripe.jsw
import { zeroDecimalCurrencies } from 'public/currencies.js';
import Stripe from 'stripe';
import wixSecretsBackend from 'wix-secrets-backend';

/**
 * @param {number} amount
 * @param {string} currency
 * @param {boolean} monthly
 */
export async function checkout(amount, currency, monthly) {
  const stripe = new Stripe(await wixSecretsBackend.getSecret('stripeApiKey'));
  return await stripe.checkout.sessions
    .create({
      success_url: 'https://audioseva.com/thank-you',
      cancel_url: 'https://audioseva.com/donate',
      line_items: [
        {
          price_data: {
            unit_amount:
              amount * (zeroDecimalCurrencies.includes(currency) ? 1 : 100),
            currency: currency.toLowerCase(),
            product_data: { name: 'Donation' },
            recurring: monthly
              ? { interval: 'month', interval_count: 1 }
              : undefined,
          },
          quantity: 1,
        },
      ],
      mode: monthly ? 'subscription' : 'payment',
      submit_type: monthly ? undefined : 'donate',
      metadata: { cause: 'audioseva' },
    })
    .then(
      (session) => session.url,
      /** @param {{message: string}} error */
      (error) =>
        Promise.reject(
          error.message
            .replace("The Checkout Session's total", 'Your donation')
            .replace('50 cents. ', '$0.5.\n')
        )
    );
}
