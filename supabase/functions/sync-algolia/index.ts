import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: "create" | "update" | "delete" | "full_sync";
  product_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ALGOLIA_APP_ID = Deno.env.get("ALGOLIA_APP_ID");
    const ALGOLIA_ADMIN_KEY = Deno.env.get("ALGOLIA_ADMIN_KEY");
    const ALGOLIA_INDEX_NAME = Deno.env.get("ALGOLIA_INDEX_NAME") || "products";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
      console.log("Algolia credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Algolia not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, product_id }: SyncRequest = await req.json();

    const algoliaUrl = `https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}`;
    const algoliaHeaders = {
      "X-Algolia-API-Key": ALGOLIA_ADMIN_KEY,
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "Content-Type": "application/json",
    };

    if (action === "delete" && product_id) {
      // Delete from Algolia
      const response = await fetch(`${algoliaUrl}/${product_id}`, {
        method: "DELETE",
        headers: algoliaHeaders,
      });

      await supabase.from("algolia_sync_log").insert({
        product_id,
        action: "delete",
        status: response.ok ? "synced" : "failed",
        synced_at: response.ok ? new Date().toISOString() : null,
      });

      return new Response(
        JSON.stringify({ success: response.ok }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch products to sync
    let query = supabase
      .from("products")
      .select(`
        id, title, slug, description, price, compare_at_price, 
        images, category, subcategory, tags, vendor_id,
        rating, review_count, stock_quantity, is_active,
        vendors(brand_name, slug)
      `)
      .eq("is_active", true);

    if (product_id && action !== "full_sync") {
      query = query.eq("id", product_id);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Transform products for Algolia
    const algoliaRecords = products.map((product: any) => ({
      objectID: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description?.substring(0, 500),
      price: product.price,
      compare_at_price: product.compare_at_price,
      image: product.images?.[0],
      category: product.category,
      subcategory: product.subcategory,
      tags: product.tags || [],
      vendor_name: product.vendors?.brand_name,
      vendor_slug: product.vendors?.slug,
      rating: product.rating || 0,
      review_count: product.review_count || 0,
      in_stock: product.stock_quantity > 0,
      discount_percentage: product.compare_at_price 
        ? Math.round((1 - product.price / product.compare_at_price) * 100)
        : 0,
    }));

    // Batch save to Algolia
    const batchResponse = await fetch(`${algoliaUrl}/batch`, {
      method: "POST",
      headers: algoliaHeaders,
      body: JSON.stringify({
        requests: algoliaRecords.map((record) => ({
          action: "updateObject",
          body: record,
        })),
      }),
    });

    const batchResult = await batchResponse.json();

    // Log sync results
    for (const product of products) {
      await supabase.from("algolia_sync_log").insert({
        product_id: product.id,
        action: action === "full_sync" ? "update" : action,
        status: batchResponse.ok ? "synced" : "failed",
        algolia_object_id: product.id,
        error_message: batchResponse.ok ? null : JSON.stringify(batchResult),
        synced_at: batchResponse.ok ? new Date().toISOString() : null,
      });
    }

    console.log(`Synced ${products.length} products to Algolia`);

    return new Response(
      JSON.stringify({ 
        success: batchResponse.ok, 
        synced: products.length,
        task_id: batchResult.taskID,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in sync-algolia:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
