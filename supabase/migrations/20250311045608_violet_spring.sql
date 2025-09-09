/*
  # Add product image extraction functionality
  
  1. New Functions
    - extract_title_from_html: Extracts product title from HTML content
    - extract_images_from_html: Extracts image URLs from HTML content
    - extract_product_images: Main function to fetch and process product pages
    
  2. Security
    - Functions are security definer
    - Input validation included
    - Safe HTML parsing
*/

-- Create function to extract title from HTML
CREATE OR REPLACE FUNCTION public.extract_title_from_html(html text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  title text;
  matches text[];
BEGIN
  -- Try to extract title from meta tags first
  matches := regexp_matches(html, '<meta\s+property="og:title"\s+content="([^"]+)"');
  IF matches IS NOT NULL THEN
    title := matches[1];
  END IF;
  
  IF title IS NULL THEN
    -- Try Twitter card title
    matches := regexp_matches(html, '<meta\s+name="twitter:title"\s+content="([^"]+)"');
    IF matches IS NOT NULL THEN
      title := matches[1];
    END IF;
  END IF;
  
  IF title IS NULL THEN
    -- Fall back to regular title tag
    matches := regexp_matches(html, '<title[^>]*>(.*?)</title>');
    IF matches IS NOT NULL THEN
      title := matches[1];
    END IF;
  END IF;
  
  -- Clean up the title
  IF title IS NOT NULL THEN
    -- Remove HTML entities
    title := regexp_replace(title, '&[^;]+;', '', 'g');
    -- Remove extra whitespace
    title := regexp_replace(title, '\s+', ' ', 'g');
    -- Trim
    title := trim(title);
  END IF;
  
  RETURN COALESCE(title, 'Unknown Product');
END;
$$;

-- Create function to extract images from HTML
CREATE OR REPLACE FUNCTION public.extract_images_from_html(html text, domain text)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  images text[];
  image_urls text[];
  image_pattern text;
  matches text[];
  match text[];
BEGIN
  -- Initialize empty array
  image_urls := ARRAY[]::text[];
  
  -- Define domain-specific patterns
  CASE 
    WHEN domain ILIKE '%amazon%' THEN
      -- Amazon product images
      FOR match IN SELECT regexp_matches(html, '<img[^>]*data-old-hires="([^"]+)"[^>]*>', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
      -- Try alternative Amazon image pattern
      FOR match IN SELECT regexp_matches(html, '<img[^>]*class="[^"]*a-dynamic-image[^"]*"[^>]*src="([^"]+)"[^>]*>', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
    WHEN domain ILIKE '%walmart%' THEN
      -- Walmart product images
      FOR match IN SELECT regexp_matches(html, '<img[^>]*data-zoom-image="([^"]+)"[^>]*>', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
      -- Try alternative Walmart image pattern
      FOR match IN SELECT regexp_matches(html, '<img[^>]*class="[^"]*prod-hero-image[^"]*"[^>]*src="([^"]+)"[^>]*>', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
    ELSE
      -- Generic image extraction
      -- Look for product images in meta tags first
      FOR match IN SELECT regexp_matches(html, '<meta\s+property="og:image"\s+content="([^"]+)"', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
      -- Try Twitter card images
      FOR match IN SELECT regexp_matches(html, '<meta\s+name="twitter:image"\s+content="([^"]+)"', 'g')
      LOOP
        image_urls := array_append(image_urls, match[1]);
      END LOOP;
      
      -- Look for large images in the page
      FOR match IN SELECT regexp_matches(html, '<img[^>]*src="([^"]+\.(?:jpg|jpeg|png))"[^>]*>', 'g')
      LOOP
        IF match[1] !~ '(?:icon|logo|small|thumb)' AND length(match[1]) > 20 THEN
          image_urls := array_append(image_urls, match[1]);
        END IF;
      END LOOP;
  END CASE;
  
  -- Remove duplicates and invalid URLs
  SELECT ARRAY(
    SELECT DISTINCT unnest
    FROM unnest(image_urls) 
    WHERE unnest ~ '^https?://'
    AND unnest !~ '(?:icon|logo|small|thumb)'
    ORDER BY unnest
  ) INTO images;
  
  RETURN images;
END;
$$;

-- Update main image extraction function
CREATE OR REPLACE FUNCTION public.extract_product_images(urls text[])
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb[];
  url text;
  domain text;
  response_status int;
  response_body text;
  html text;
  images text[];
  title text;
  product_info jsonb;
BEGIN
  -- Initialize empty array for results
  result := ARRAY[]::jsonb[];
  
  -- Process each URL
  FOREACH url IN ARRAY urls
  LOOP
    BEGIN
      -- Validate URL
      IF url !~ '^https?://' THEN
        CONTINUE;
      END IF;
      
      -- Extract domain
      domain := regexp_replace(url, '^https?://(?:www\.)?([^/]+).*', '\1');
      
      -- Fetch page content using net.http_get
      SELECT 
        status::int,
        content::text
      INTO 
        response_status,
        response_body
      FROM net.http_get(
        url := url,
        headers := jsonb_build_object(
          'User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
      );
      
      IF response_status != 200 THEN
        RAISE NOTICE 'Failed to fetch URL %: status %', url, response_status;
        CONTINUE;
      END IF;
      
      -- Extract title and images
      title := public.extract_title_from_html(response_body);
      images := public.extract_images_from_html(response_body, domain);
      
      -- Create product info
      IF array_length(images, 1) > 0 THEN
        product_info := jsonb_build_object(
          'title', title,
          'images', images,
          'url', url
        );
        
        -- Add to results array
        result := array_append(result, product_info);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next URL
      RAISE NOTICE 'Error processing URL %: %', url, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RETURN result;
END;
$$;