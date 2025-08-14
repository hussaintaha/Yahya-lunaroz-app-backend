import { CREATE_RETURN, GET_RETURNABLE_ITEMS } from "../graphql/mutations";
import { ShopifySession } from "../models/ShopifySession";

const mapReturnReason = (reason) => {
  switch (reason?.toLowerCase()) {
    case 'item damaged/defective':
    case 'damaged':
    case 'defective':
    case 'broken':
      return 'DEFECTIVE';

    case 'wrong item received':
    case 'wrong item':
    case 'incorrect item':
      return 'WRONG_ITEM';

    case 'quality not as expected':
    case 'not as described':
    case 'different than expected':
      return 'NOT_AS_DESCRIBED';

    case 'arrived too late':
    case 'late delivery':
    case 'arrived late':
      return 'OTHER'; 

    case 'ordered by mistake':
    case 'unwanted':
    case 'changed mind':
    case 'no longer needed':
      return 'UNWANTED';

    case 'size too small':
      return 'SIZE_TOO_SMALL';

    case 'size too large':
      return 'SIZE_TOO_LARGE';

    default:
      return 'OTHER';
  }
};


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
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const [session] = await ShopifySession.find();
    const { orderId, action: requestAction, ...body } = await request.json();
    const endpoint = `https://${session.shop}/admin/api/2025-07/graphql.json`;

    switch (requestAction) {
      case 'getReturnableItems':
        return await getReturnableItems(endpoint, session.accessToken, orderId);
      case 'createReturn':
        return await createReturn(endpoint, session.accessToken, orderId, body.returnLineItems);
      default:
        return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
    }
  } catch (error) {
    console.error('Return API error:', error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};

async function getReturnableItems(endpoint, token, orderId) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query: GET_RETURNABLE_ITEMS,
      variables: { orderId }
    })
  });
  const data = await res.json();

  if (data?.errors?.length) {
    return new Response(JSON.stringify({ success: false, errors: data.errors }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    returnableFulfillments: data?.data?.returnableFulfillments || null
  }), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

async function createReturn(endpoint, token, orderId, returnLineItems) {
  const mappedItems = returnLineItems.map(item => ({
    fulfillmentLineItemId: item.fulfillmentLineItemId,
    quantity: item.quantity,
    returnReason: mapReturnReason(item.returnReason)
  }));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query: CREATE_RETURN,
      variables: {
        returnInput: { orderId, returnLineItems: mappedItems }
      }
    })
  });

  const data = await res.json();

  if (data?.errors?.length || data?.data?.returnCreate?.userErrors?.length) {
    return new Response(JSON.stringify({
      success: false,
      errors: data.errors || data.data.returnCreate.userErrors
    }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    return: data?.data?.returnCreate?.return
  }), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}