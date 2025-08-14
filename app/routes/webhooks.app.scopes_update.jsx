import { authenticate } from "../shopify.server";
import { ShopifySession } from "../models/ShopifySession.js";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  const current = payload.current;
  if (session) {
    await ShopifySession.findOneAndUpdate(
      { $and: [{ shop }, { id: session.id }] },
      { $set: { scope: current.toString() } },
      {new: true, upsert: true}
    ).lean();
  }

  return new Response();
};
