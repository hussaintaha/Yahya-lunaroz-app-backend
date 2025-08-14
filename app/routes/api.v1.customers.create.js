import axios from 'axios'
import { CUSTOMER_CREATE } from '../graphql/mutations'
import { ShopifySession } from '../models/ShopifySession';

export const action = async ({ request }) => {

    try {

        const incomingData = await request.json();

        const session = await ShopifySession.find()

        const response = await axios.post(`${process.env.SHOPIFY_GRAPHQL_BASE_URL}`,{query: CUSTOMER_CREATE,variables: { ...incomingData },},
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Storefront-Access-Token": session?.[0]?.accessToken,
                },
            }
        );


        return new Response(JSON.stringify({ success: true, message: "Customer created successfully." }), {
            status: 200, headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        if(error instanceof Error){
            console.error("An error occurred while creating a customer:", error);
        }else{
            console.log("An unknown error occurred.");
        }

        return new Response(JSON.stringify({ success: false, error: "Internal server error." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
