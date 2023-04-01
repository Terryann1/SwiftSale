const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

'use strict';

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({strapi})=> ({
    async create(ctx) {
        try {
            const {products} = ctx.request.body;

            const lineItems = await Promise.all(
                products.map(async (product) => { 
                    const item = await strapi.service("api::product.product").findOne(product.id);

                    return {
                        price_data: {
                            currency: "kes",
                            product_data: {
                                name: item.title,
                            },
                            unit_amount: item.price * 100,
                        },
                        quantity: 1,
                    };
                })
            );

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                success_url: `${process.env.CLIENT_URL}?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?success=false`,
                line_items: lineItems,
                shipping_address_collection: { allowed_countries: ["US", "KE"] },
                payment_method_types: ["card"],
            });

            await strapi.service("api::order.order").create({
                data: {
                    products,
                    stripeId: session.id,
                },
            });

            console.log('Stripe session created successfully:', session);
            ctx.response.body = { stripeSession: session };
        } catch (err) {
            console.error('Error creating Stripe session:', err);
            ctx.response.status = 500;
            ctx.response.body = { error: err.message };
        }
    }
}));
