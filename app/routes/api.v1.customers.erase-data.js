import { ShopifySession } from "../models/ShopifySession";

export async function loader() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "DELETE") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Customer ID is required" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const customerGID = id.startsWith("gid://shopify/Customer/") ? id : `gid://shopify/Customer/${id}`;

    const [shopifySession] = await ShopifySession.find();
    if (!shopifySession?.accessToken || !shopifySession?.shop) {
      return new Response(JSON.stringify({ success: false, error: "Shopify session not found" }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const shopifyEndpoint = `https://${shopifySession.shop}/admin/api/2025-07/graphql.json`;

    const eraseResponse = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifySession.accessToken,
      },
      body: JSON.stringify({
        query: `
          mutation customerRequestDataErasure($customerId: ID!) {
            customerRequestDataErasure(customerId: $customerId) {
              customerId
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: { customerId: customerGID },
      }),
    });

    const eraseData = await eraseResponse.json();
    const erasedCustomerId = eraseData?.data?.customerRequestDataErasure?.customerId;
    const eraseErrors = eraseData?.data?.customerRequestDataErasure?.userErrors || [];

    if (erasedCustomerId) {
      return new Response(
        JSON.stringify({
          success: true,
          method: "erasure",
          customerId: erasedCustomerId,
          message: "Data erasure request submitted",
          note: "For customers with orders: Data will be erased after 180 days as per Shopify's retention policy",
        }),
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Customer data erasure failed", eraseErrors }),
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    console.error("Error erasing customer data:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
