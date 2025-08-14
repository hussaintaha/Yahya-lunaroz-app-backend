import { ShopifySession } from "../models/ShopifySession";

export async function loader() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
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

    const deleteResponse = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifySession.accessToken,
      },
      body: JSON.stringify({
        query: `
          mutation customerDelete($id: ID!) {
            customerDelete(input: { id: $id }) {
              deletedCustomerId
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: { id: customerGID },
      }),
    });

    const deleteData = await deleteResponse.json();
    const deletedCustomerId = deleteData?.data?.customerDelete?.deletedCustomerId;
    const deleteErrors = deleteData?.data?.customerDelete?.userErrors || [];

    if (deletedCustomerId) {
      return new Response(
        JSON.stringify({ success: true, method: "delete", customerId: deletedCustomerId, message: "Customer deleted successfully" }),
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Customer could not be deleted", deleteErrors }),
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    console.error("Error deleting customer:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}