// Pure data functions. Same return shapes as the old Express /products routes so Track B's
// Worker (and the chat tool runner) are a drop-in. Param names match validate_search_params.js.

function buildParams(q) {
  return {
    p_keyword: q.keyword ?? null,
    p_brand: q.brand ?? null,
    p_screen_type: q.screenType ?? null,
    p_resolution: q.resolution ?? null,
    p_refresh_rate: q.refreshRate != null ? parseInt(q.refreshRate, 10) : null,
    p_min_price: q.minPrice != null ? Number(q.minPrice) : null,
    p_max_price: q.maxPrice != null ? Number(q.maxPrice) : null,
    p_min_size: q.minScreenSize != null ? Number(q.minScreenSize) : null,
    p_max_size: q.maxScreenSize != null ? Number(q.maxScreenSize) : null,
    p_connectivity: q.connectivity ?? null,
    p_smart_platform: q.smartTVPlatform ?? null,
    p_supported_service: q.supportedService ?? null,
    p_features: q.features ?? null,
    p_sort_by: q.sortBy ?? null,
    p_limit: q.limit != null ? parseInt(q.limit, 10) : 9,
    p_offset: q.pagination != null ? (parseInt(q.pagination, 10) - 1) * (q.limit ? parseInt(q.limit, 10) : 9) : 0,
  };
}

export async function searchProducts(supabase, q) {
  const { data, error } = await supabase.rpc('search_products', buildParams(q));
  if (error) throw new Error(`search_products failed: ${error.message}`);
  // shape into the old result objects (front-end keys preserved)
  return (data ?? []).map((r) => ({
    _id: r.id,
    productName: r.name,
    productPrice: r.price,
    productImageList: r.image_list,
    productRating: r.rating,
    productReviewCount: r.review_count,
    productShortSpec: r.short_spec,
    productSpec: r.spec,
    productFeatures: r.features,
    score: r.score,
  }));
}

export async function getProductDetails(supabase, productId, { excludeReview = false } = {}) {
  const { data: p, error } = await supabase.from('products').select('*').eq('id', productId).single();
  if (error || !p) return null;
  const base = {
    id: p.id,
    productName: p.name,
    productModelCode: p.model_code,
    productPrice: p.price,
    productShortSpec: p.short_spec,
    productFeatures: p.features,
    productImageList: p.image_list,
    productDetail: p.detail,
    productSpec: p.spec,
  };
  if (excludeReview) return base;
  const { data: reviews } = await supabase.from('reviews').select('*').eq('product_id', productId).order('id');
  return {
    ...base,
    productReview: {
      rating: p.rating, reviewCount: p.review_count,
      ratingDistributionList: p.rating_distribution,
      reviewList: (reviews ?? []).map((r) => ({
        userName: r.user_name, reviewTitle: r.title, reviewDate: r.review_date,
        rating: r.rating, review: r.body,
      })),
    },
  };
}

export async function getProductReviews(supabase, productId) {
  const { data: p, error } = await supabase.from('products').select('id,name,rating,review_count,rating_distribution').eq('id', productId).single();
  if (error || !p) return null;
  const { data: reviews } = await supabase.from('reviews').select('*').eq('product_id', productId).order('id');
  return {
    id: p.id,
    productName: p.name,
    productReview: {
      rating: p.rating, reviewCount: p.review_count,
      ratingDistributionList: p.rating_distribution,
      reviewList: (reviews ?? []).map((r) => ({
        userName: r.user_name, reviewTitle: r.title, reviewDate: r.review_date,
        rating: r.rating, review: r.body,
      })),
    },
  };
}
