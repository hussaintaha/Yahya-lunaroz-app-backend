import { ShopifySession } from "../models/ShopifySession.js"
import { authenticate } from "../shopify.server";

// Webhook handler
export const action = async ({ request }) => {
  try {
    const { shop, admin } = await authenticate.webhook(request);

    const session = await ShopifySession.findOne({ shop });


    return new Response(
      JSON.stringify({ message: "Successfully uninstalled", success: true }),
      { status: 200 },
    );
  } catch (err) {
    console.error("Error processing APP_UNINSTALLED webhook:", err);
    return new Response(null, { status: 500 });
  }
};
