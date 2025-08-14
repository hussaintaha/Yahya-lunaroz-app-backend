import { ShopifySession } from "../models/ShopifySession";

const GET_ORDER_BY_ID = `
query getOrderById($orderId: ID!) {
  order(id: $orderId) {
    id
    name
    createdAt
    cancelReason
    cancelledAt
    number
    returnStatus
    subtotalPriceSet {
      presentmentMoney {
        amount
        currencyCode
      }
    }
    totalPriceSet {
      presentmentMoney {
        amount
        currencyCode
      }
    }
    taxesIncluded
    totalTaxSet {
      presentmentMoney {
        amount
        currencyCode
      }
    }
    cancellation {
      staffNote
    }
    customer {
      id
      firstName
      lastName
      email
    }
    lineItems(first: 250) {
      edges {
        node {
          currentQuantity
          image {
            url
          }
          name
          sku
          title
          vendor
          variantTitle
          originalUnitPriceSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
    returns(first: 10) {
      edges {
        node {
          id
          name
          status
          createdAt
          closedAt
          returnLineItems(first: 10) {
            edges {
              node {
                ... on ReturnLineItem {
                  quantity
                  returnReason
                  returnReasonNote
                  fulfillmentLineItem {
                    lineItem {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    refunds(first: 10) {
      id
      createdAt
      note
      totalRefundedSet {
        shopMoney {
          amount
          currencyCode
        }
      }
    }
  }
}
`;

export async function loader() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  try {
    const [session] = await ShopifySession.find();
    const { orderId } = await request.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: "orderId is required" }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const shopifyEndpoint = `https://${session.shop}/admin/api/2025-07/graphql.json`;

    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session?.accessToken,
      },
      body: JSON.stringify({
        query: GET_ORDER_BY_ID,
        variables: { orderId: `gid://shopify/Order/${orderId}` },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return new Response(
        JSON.stringify({ success: false, error: data.errors }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const order = data?.data?.order;
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(JSON.stringify({ 
      success: true,
      order: order
    }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
};
