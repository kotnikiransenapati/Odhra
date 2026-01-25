/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedProduct {
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  stock: number;
  weight?: string;
  sku?: string;
  category?: string;
  tags?: string[];
  rawText?: string;
}

// Parse text to extract product data using pattern matching
function extractProductsFromText(text: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Common patterns for product data
  const pricePatterns = [
    /₹\s*([\d,]+(?:\.\d{2})?)/g,
    /Rs\.?\s*([\d,]+(?:\.\d{2})?)/gi,
    /INR\s*([\d,]+(?:\.\d{2})?)/gi,
    /\$\s*([\d,]+(?:\.\d{2})?)/g,
    /Price[:\s]*([\d,]+(?:\.\d{2})?)/gi,
    /MRP[:\s]*₹?\s*([\d,]+(?:\.\d{2})?)/gi,
  ];
  
  const weightPatterns = [
    /(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|kilogram|ml|l|liter|litre)/gi,
    /Weight[:\s]*([\d.]+\s*(?:kg|g|gm|ml|l))/gi,
  ];
  
  const skuPatterns = [
    /SKU[:\s#]*([A-Z0-9-]+)/gi,
    /Code[:\s#]*([A-Z0-9-]+)/gi,
    /Item[:\s#]*([A-Z0-9-]+)/gi,
    /Product\s*ID[:\s#]*([A-Z0-9-]+)/gi,
  ];
  
  const stockPatterns = [
    /Stock[:\s]*(\d+)/gi,
    /Qty[:\s]*(\d+)/gi,
    /Quantity[:\s]*(\d+)/gi,
    /Available[:\s]*(\d+)/gi,
    /In\s*Stock[:\s]*(\d+)/gi,
  ];

  // Try to detect table-like structures
  const tableRows: string[][] = [];
  
  for (const line of lines) {
    // Check if line looks like a table row (has multiple tab/space separated values)
    const cells = line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      tableRows.push(cells);
    }
  }
  
  // If we have table data, try to parse it
  if (tableRows.length > 1) {
    // Try to identify header row
    const potentialHeaders = tableRows[0].map(h => h.toLowerCase());
    const headerMap: Record<string, number> = {};
    
    potentialHeaders.forEach((h, i) => {
      if (h.includes('name') || h.includes('title') || h.includes('product') || h.includes('item')) {
        headerMap.title = i;
      }
      if (h.includes('price') || h.includes('mrp') || h.includes('rate') || h.includes('cost')) {
        headerMap.price = i;
      }
      if (h.includes('description') || h.includes('desc') || h.includes('details')) {
        headerMap.description = i;
      }
      if (h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('available')) {
        headerMap.stock = i;
      }
      if (h.includes('weight') || h.includes('size')) {
        headerMap.weight = i;
      }
      if (h.includes('sku') || h.includes('code') || h.includes('id')) {
        headerMap.sku = i;
      }
      if (h.includes('category') || h.includes('type') || h.includes('group')) {
        headerMap.category = i;
      }
    });
    
    // If we found some headers, parse the data rows
    if (Object.keys(headerMap).length > 0) {
      for (let i = 1; i < tableRows.length; i++) {
        const row = tableRows[i];
        const product: ExtractedProduct = {
          title: '',
          description: '',
          price: 0,
          stock: 0,
          rawText: row.join(' | '),
        };
        
        if (headerMap.title !== undefined && row[headerMap.title]) {
          product.title = row[headerMap.title];
        }
        if (headerMap.price !== undefined && row[headerMap.price]) {
          const priceStr = row[headerMap.price].replace(/[₹$,Rs.INR\s]/gi, '');
          product.price = parseFloat(priceStr) || 0;
        }
        if (headerMap.description !== undefined && row[headerMap.description]) {
          product.description = row[headerMap.description];
        }
        if (headerMap.stock !== undefined && row[headerMap.stock]) {
          product.stock = parseInt(row[headerMap.stock]) || 0;
        }
        if (headerMap.weight !== undefined && row[headerMap.weight]) {
          product.weight = row[headerMap.weight];
        }
        if (headerMap.sku !== undefined && row[headerMap.sku]) {
          product.sku = row[headerMap.sku];
        }
        if (headerMap.category !== undefined && row[headerMap.category]) {
          product.category = row[headerMap.category];
        }
        
        if (product.title || product.price > 0) {
          products.push(product);
        }
      }
      
      return products;
    }
  }
  
  // Fallback: Try to extract products from unstructured text
  const productBlocks: string[] = [];
  let currentBlock = '';
  
  for (const line of lines) {
    // Check if this line contains a price
    let hasPrice = false;
    for (const pattern of pricePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        hasPrice = true;
        break;
      }
    }
    
    if (hasPrice) {
      if (currentBlock) {
        productBlocks.push(currentBlock);
      }
      currentBlock = line;
    } else if (currentBlock) {
      currentBlock += ' ' + line;
    } else {
      currentBlock = line;
    }
  }
  if (currentBlock) {
    productBlocks.push(currentBlock);
  }
  
  // Parse each block
  for (const block of productBlocks) {
    const product: ExtractedProduct = {
      title: '',
      description: '',
      price: 0,
      stock: 0,
      rawText: block,
    };
    
    // Extract price
    for (const pattern of pricePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(block);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        product.price = parseFloat(priceStr) || 0;
        break;
      }
    }
    
    // Extract weight
    for (const pattern of weightPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(block);
      if (match) {
        product.weight = match[0];
        break;
      }
    }
    
    // Extract SKU
    for (const pattern of skuPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(block);
      if (match) {
        product.sku = match[1];
        break;
      }
    }
    
    // Extract stock
    for (const pattern of stockPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(block);
      if (match) {
        product.stock = parseInt(match[1]) || 0;
        break;
      }
    }
    
    // Extract title
    let titleCandidate = block
      .replace(/₹[\d,]+(?:\.\d{2})?/g, '')
      .replace(/Rs\.?\s*[\d,]+(?:\.\d{2})?/gi, '')
      .replace(/MRP[:\s]*[\d,]+(?:\.\d{2})?/gi, '')
      .replace(/SKU[:\s#]*[A-Z0-9-]+/gi, '')
      .replace(/\d+(?:\.\d+)?\s*(?:kg|g|gm|ml|l)/gi, '')
      .trim();
    
    const titleParts = titleCandidate.split(/[.\n]/);
    product.title = titleParts[0]?.substring(0, 100).trim() || '';
    
    if (titleParts.length > 1) {
      product.description = titleParts.slice(1).join('. ').trim();
    }
    
    if (product.title || product.price > 0) {
      products.push(product);
    }
  }
  
  return products;
}

// Use AI to extract products
async function extractProductsWithAI(text: string): Promise<ExtractedProduct[]> {
  const truncatedText = text.substring(0, 15000);
  
  const prompt = `You are a product data extraction expert. Analyze the following text from a PDF document and extract all product information.

For each product found, extract:
- title: Product name/title
- description: Product description
- price: Numeric price value (just the number, no currency symbols)
- compare_at_price: Original/MRP price if different from selling price
- stock: Quantity available (default to 0 if not found)
- weight: Product weight with unit (e.g., "500g", "1kg")
- sku: Product SKU/code
- category: Product category if mentioned
- tags: Array of relevant tags

Return a JSON array of products. If no products are found, return an empty array.
Only return valid JSON, no additional text.

Text to analyze:
${truncatedText}`;

  try {
    // Use Lovable AI endpoint
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        message: prompt,
        extractJson: true,
      }),
    });

    if (!response.ok) {
      console.error('AI extraction failed:', await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.response || data.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const products = JSON.parse(jsonMatch[0]);
      return products.map((p: Record<string, unknown>) => ({
        title: String(p.title || ''),
        description: String(p.description || ''),
        price: parseFloat(String(p.price)) || 0,
        compare_at_price: p.compare_at_price ? parseFloat(String(p.compare_at_price)) : undefined,
        stock: parseInt(String(p.stock)) || 0,
        weight: String(p.weight || ''),
        sku: String(p.sku || ''),
        category: String(p.category || ''),
        tags: Array.isArray(p.tags) ? p.tags : [],
        rawText: '',
      }));
    }
  } catch (error) {
    console.error('AI extraction error:', error);
  }
  
  return [];
}

// Simple PDF text extraction
function extractTextFromPDF(base64Data: string): string {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdfString = new TextDecoder('latin1').decode(bytes);
    const textParts: string[] = [];
    const streamMatches = pdfString.matchAll(/stream\s*([\s\S]*?)\s*endstream/gi);
    
    for (const match of streamMatches) {
      const streamContent = match[1];
      
      const textMatches = streamContent.matchAll(/\(([^)]+)\)\s*Tj/g);
      for (const textMatch of textMatches) {
        textParts.push(textMatch[1]);
      }
      
      const tjMatches = streamContent.matchAll(/\[(.*?)\]\s*TJ/gi);
      for (const tjMatch of tjMatches) {
        const parts = tjMatch[1].matchAll(/\(([^)]*)\)/g);
        for (const part of parts) {
          textParts.push(part[1]);
        }
      }
    }
    
    let text = textParts.join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    
    const plainTextMatches = pdfString.matchAll(/\/T\s*\((.*?)\)/g);
    for (const match of plainTextMatches) {
      text += ' ' + match[1];
    }
    
    const hexMatches = pdfString.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g);
    for (const match of hexMatches) {
      const hex = match[1];
      let decoded = '';
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode >= 32 && charCode < 127) {
          decoded += String.fromCharCode(charCode);
        }
      }
      text += ' ' + decoded;
    }
    
    return text.trim();
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing PDF: ${fileName}`);
    
    // Extract text from PDF
    let extractedText = extractTextFromPDF(pdfBase64);
    console.log(`Extracted text length: ${extractedText.length}`);
    
    let products: ExtractedProduct[] = [];
    
    // Try pattern-based extraction first
    if (extractedText.length > 50) {
      products = extractProductsFromText(extractedText);
      console.log(`Pattern extraction found ${products.length} products`);
    }
    
    // If no products found and we have text, try AI extraction
    if (products.length === 0 && extractedText.length > 50) {
      console.log('Trying AI extraction...');
      products = await extractProductsWithAI(extractedText);
      console.log(`AI extraction found ${products.length} products`);
    }
    
    // If still no products, try to extract prices as last resort
    if (products.length === 0) {
      const priceMatches = extractedText.match(/[₹$]?\s*\d{2,6}(?:[,.]\d{2})?/g) || [];
      if (priceMatches.length > 0) {
        products = priceMatches.slice(0, 10).map((price, i) => ({
          title: `Product ${i + 1} (needs editing)`,
          description: 'Extracted from PDF - please update details',
          price: parseFloat(price.replace(/[₹$,\s]/g, '')) || 0,
          stock: 0,
          rawText: `Detected price: ${price}`,
        }));
      }
    }
    
    return new Response(
      JSON.stringify({ 
        products,
        extractedTextLength: extractedText.length,
        message: products.length > 0 
          ? `Successfully extracted ${products.length} products` 
          : 'No products could be extracted. The PDF may be scanned/image-based or have an unsupported format.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PDF processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
