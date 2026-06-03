create or replace function conversation_statistics(p_cid uuid)
returns table (
  message_count int, user_message_count int, assistant_message_count int,
  word_count int, user_word_count int, assistant_word_count int,
  avg_word_count numeric, avg_user_word_count numeric, avg_assistant_word_count numeric,
  filter_product_count int, get_product_count int, get_product_review_count int,
  duration numeric, avg_duration numeric,
  avg_user_response_time numeric, avg_assistant_response_time numeric
) language sql stable as $$
  with m as (
    select role,
           -- replicate historical content.split(' ').length (literal single-space split)
           array_length(string_to_array(content, ' '), 1) as wc,
           tool_call_name,
           date_trunc('second', created_at) as ts,
           date_trunc('second', created_at)
             - lag(date_trunc('second', created_at)) over (order by created_at) as gap
    from messages where conversation_id = p_cid order by created_at
  )
  select
    count(*)::int,
    count(*) filter (where role='user')::int,
    count(*) filter (where role='assistant')::int,
    coalesce(sum(wc),0)::int,
    coalesce(sum(wc) filter (where role='user'),0)::int,
    coalesce(sum(wc) filter (where role='assistant'),0)::int,
    avg(wc),
    avg(wc) filter (where role='user'),
    avg(wc) filter (where role='assistant'),
    count(*) filter (where tool_call_name='filter_products')::int,
    count(*) filter (where tool_call_name='get_product_details')::int,
    count(*) filter (where tool_call_name='get_product_reviews')::int,
    extract(epoch from (max(ts)-min(ts))),
    extract(epoch from (max(ts)-min(ts))) / nullif(count(*),0),
    coalesce(avg(extract(epoch from gap)) filter (where role='user'), 0),
    coalesce(avg(extract(epoch from gap)) filter (where role='assistant'), 0)
  from m;
$$;
