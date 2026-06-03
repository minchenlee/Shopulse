<script>
  // page/gui-detail/CustomerReview.svelte — L6.2. Faithful port of GuiProductDetail.jsx
  // CustomerReview (416-435) + its children ReviewList (438-468) and Review (471-501),
  // inlined. StatisticBlock is the L2.2 component; StarRow is gui/Star.svelte.
  import StatisticBlock from '../../components/gui/StatisticBlock.svelte'
  import StarRow from '../../components/gui/Star.svelte'

  let { rating, reviewCount, ratingDistributionList, reviewList } = $props()

  // ReviewList:440 — paginated "See More" count.
  let visibleReviewsCount = $state(5)
  const handleSeeMoreReviews = () => {
    visibleReviewsCount += 5
  }

  // Review:477 — strip the boilerplate date prefix. Done inline per-row in the markup.
  const stripDate = (reviewDate) => reviewDate.replace('Reviewed in the United States on ', '')
</script>

<div class="flex flex-col font-nunito text-primary">
  <h3 class="text-xl font-extrabold mb-6">Customer reviews</h3>
  <div class="h-auto flex flex-row space-x-10">
    <StatisticBlock {rating} {reviewCount} {ratingDistributionList} />
    <!-- ReviewList (438-468) -->
    <div class="flex flex-col w-2/3">
      {#each reviewList.slice(0, visibleReviewsCount) as review, index (index)}
        <!-- Review (471-501) -->
        <div class="flex flex-col font-nunito mb-8">
          <div class="flex flex-row items-center mb-1">
            <span class="bg-secondary w-7 h-7 rounded-full flex items-center justify-center"></span>
            <span class="ms-2 text-base font-medium text-dark-grey">
              {review.userName}
            </span>
          </div>
          <div class="flex flex-row items-center mb-1">
            <StarRow rating={review.rating} />
            <span class="ms-2 text-base font-semibold text-primary">
              {review.reviewTitle}
            </span>
          </div>
          <span class="text-base text-dark-grey mb-3">
            {stripDate(review.reviewDate)}
          </span>
          <p class="text-base text-primary">
            {review.review}
          </p>
        </div>
      {/each}
      {#if visibleReviewsCount < reviewList.length}
        <button
          onclick={handleSeeMoreReviews}
          class="mt-4 self-center bg-secondary text-primary font-nunito font-bold px-6 py-2 rounded-full border-primary border-[1px] hover:shadow-md hover:scale-105 duration-300"
        >
          See More Reviews
        </button>
      {/if}
    </div>
  </div>
</div>
