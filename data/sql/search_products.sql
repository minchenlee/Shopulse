create or replace function search_products(
  p_keyword          text    default null,
  p_brand            text    default null,
  p_screen_type      text    default null,
  p_resolution       text    default null,
  p_refresh_rate     int     default null,
  p_min_price        numeric default null,
  p_max_price        numeric default null,
  p_min_size         numeric default null,
  p_max_size         numeric default null,
  p_connectivity     text    default null,
  p_smart_platform   text    default null,
  p_supported_service text   default null,
  p_features         text    default null,
  p_sort_by          text    default null,    -- 'price'|'rating'|'popularity'|null(=round-robin)
  p_limit            int     default 9,
  p_offset           int     default 0
) returns table (
  id uuid, name text, price numeric, brand text, image_list text[],
  rating numeric, review_count int, short_spec jsonb, spec jsonb,
  features jsonb, score real
) language sql stable as $$
  with filtered as (
    select p.*,
      case when p_keyword is null then 0::real
           else (ts_rank(p.search_tsv, websearch_to_tsquery('english', p_keyword))
                 + coalesce(similarity(p.name, p_keyword), 0))::real
      end as score
    from products p
    where
      ( p_keyword is null
        or p.search_tsv @@ websearch_to_tsquery('english', p_keyword)
        or p.name  % p_keyword
        or p.brand % p_keyword )
      and (p_brand        is null or p.brand        ilike '%'||p_brand||'%')
      and (p_screen_type  is null or p.screen_type  = lower(p_screen_type))
      and (p_resolution   is null or p.resolution   = lower(p_resolution))
      and (p_refresh_rate is null or p.refresh_rate >= p_refresh_rate)
      and (p_connectivity is null
           or coalesce(p.spec->>'Inputs & Outputs','') ||' '||
              coalesce(p.spec->>'Wireless Technology','') ilike '%'||p_connectivity||'%')
      and (p_smart_platform is null
           or coalesce(p.spec->>'Smart TV Platform','') ilike '%'||p_smart_platform||'%')
      and (p_supported_service is null
           or coalesce(p.spec->>'Streaming Services','') ||' '||
              coalesce(p.spec->>'Virtual Assistant','') ilike '%'||p_supported_service||'%')
      and (p_features is null
           or coalesce(p.short_spec->>'Special Feature','') ||' '||
              coalesce(p.spec->>'Features','') ilike '%'||p_features||'%')
      and (p_min_price is null or p.price >= p_min_price)
      and (p_max_price is null or p.price <= p_max_price)
      and (p_min_size  is null or p.screen_size_in >= p_min_size)
      and (p_max_size  is null or p.screen_size_in <= p_max_size)
  ),
  ranked as (
    select f.*,
      row_number() over (
        partition by f.brand
        order by f.score desc, f.rating desc nulls last
      ) as rn_in_brand
    from filtered f
  )
  select id, name, price, brand, image_list, rating, review_count,
         short_spec, spec, features, score
  from ranked
  order by
    case when p_sort_by='price'      then price end asc  nulls last,
    case when p_sort_by='rating'     then rating end desc nulls last,
    case when p_sort_by='popularity' then review_count end desc nulls last,
    case when p_sort_by is null      then rn_in_brand end asc,
    brand asc nulls last
  limit p_limit offset p_offset;
$$;
