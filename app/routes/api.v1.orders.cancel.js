import { ORDER_CANCEL } from "../graphql/mutations";
import { ShopifySession } from "../models/ShopifySession";

const mapReason = (customReason) => {
  switch (customReason?.toLowerCase()) {
    case 'ordered by mistake':
    case 'found a better price':
    case 'change in delivery date':
    case 'item no longer needed':
    case 'wrong shipping address':
    case 'customer':
      return 'CUSTOMER';
    case 'declined':
    case 'payment declined':
      return 'DECLINED';
    case 'fraud':
    case 'fraudulent':
      return 'FRAUD';
    case 'inventory':
    case 'out of stock':
      return 'INVENTORY';
    case 'staff':
    case 'staff error':
      return 'STAFF';
    case 'other (custom)':
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
        const { id, reason, staffNote } = await request.json();

        const variables = {
            orderId: id,
            refund: true,
            restock: true,
            reason: mapReason(reason),
            notifyCustomer: true,
            staffNote: reason || staffNote,
        };

        const shopifyEndpoint = `https://${session.shop}/admin/api/2025-07/graphql.json`;

        const response = await fetch(shopifyEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": session?.accessToken,
            },
            body: JSON.stringify({
                query: ORDER_CANCEL,
                variables
            })
        });

        const data = await response.json();

        const errors = data?.errors || data?.data?.orderCancel?.orderCancelUserErrors;

        if (errors?.length) {
            return new Response(
                JSON.stringify({ success: false, error: errors }),
                {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                }
            );
        }

        return new Response(JSON.stringify({ 
            success: true,
            job: data?.data?.orderCancel?.job 
        }), {
            status: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    } catch (error) {
        console.error('Order cancel error:', error);
        return new Response(
            JSON.stringify({ success: false, error: "Internal server error" }),
            {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
            }
        );
    }
};