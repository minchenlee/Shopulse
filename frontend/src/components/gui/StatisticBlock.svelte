<script>
  // L2.2 — port of gui/StatisticBlock.jsx. Two layouts switched on isForHybrid
  // (StatisticBlock.jsx:9-49). The nested React component `RatingDistribution`
  // (:52-76) becomes a local {#snippet} so both branches reuse one definition.
  import StarRow from './Star.svelte'

  let { isForHybrid = false, rating, reviewCount, ratingDistributionList } = $props()
</script>

<!-- RatingDistribution (StatisticBlock.jsx:52-76). The bar width is the count as a
     percentage; React used style={{width: `${parseInt(count)}%`}} → style:width here. -->
{#snippet ratingDistribution(forHybrid)}
  <div class="flex flex-col w-full">
    {#each ratingDistributionList as rd, index (index)}
      <div class="flex flex-row items-center mb-1">
        <div class="md:me-2 me-1">
          {rd.rating}
        </div>
        <div class={forHybrid ? 'w-3/4' : 'w-[70%]'}>
          <div class="w-full bg-gray-200 h-3 rounded-full">
            <div class="bg-primary h-3 rounded-full" style:width={`${parseInt(rd.count)}%`}></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/snippet}

{#if isForHybrid}
  <!-- hybrid layout (StatisticBlock.jsx:10-28) -->
  <div class="w-full h-100vh relative my-3">
    <div class="w-full flex flex-row items-center">
      <div class="w-1/3 flex flex-col space-y-2">
        <p class="text-2xl font-extrabold leading-none">
          {rating} out of 5
        </p>
        <div class="flex flex-row items-center">
          <StarRow {rating} />
          <div class="ms-4">
            {reviewCount} ratings
          </div>
        </div>
      </div>
      <div class="w-2/3">
        {@render ratingDistribution(true)}
      </div>
    </div>
  </div>
{:else}
  <!-- default (GUI) layout (StatisticBlock.jsx:33-48) -->
  <div class="h-100vh relative">
    <div class="flex flex-col space-y-4 sticky top-[calc(78px+1rem)]">
      <p class="text-2xl font-extrabold leading-none">
        {rating} out of 5
      </p>
      <div class="flex flex-row items-center">
        <StarRow {rating} />
        <div class="ms-4">
          {reviewCount} ratings
        </div>
      </div>
      {@render ratingDistribution(false)}
    </div>
  </div>
{/if}
