import { StarRow } from './Star';

export default function StatisticBlock(props){
  const isForHybrid = props.isForHybrid;
  const rating = props.rating;
  const reviewCount = props.reviewCount;
  const ratingDistributionList = props.ratingDistributionList;

  if (isForHybrid){
    return(
      <div className='w-full h-100vh relative my-3'>
        <div className='w-full flex flex-row items-center'>
          <div className='w-1/3 flex flex-col space-y-2'>
            <p className='text-2xl font-extrabold leading-none'>
              {rating} out of 5
            </p>
            <div className='flex flex-row items-center'>
              <StarRow rating={rating}/>
              <div className='ms-4'>
                {reviewCount} ratings
              </div>
            </div>
          </div>
          <div className='w-2/3'>
            <RatingDistribution ratingDistributionList={ratingDistributionList} isForHybrid={isForHybrid}/>
          </div>
        </div>
      </div>
    )
  }


  return(
    <div className='h-100vh relative'>
      <div className='flex flex-col space-y-4 sticky top-[calc(78px+1rem)]'>
        <p className='text-2xl font-extrabold leading-none'>
          {rating} out of 5
        </p>
        <div className='flex flex-row items-center'>
          <StarRow rating={rating}/>
          <div className='ms-4'>
            {reviewCount} ratings
          </div>
        </div>
        <RatingDistribution ratingDistributionList={ratingDistributionList}/>
      </div>
    </div>
  )
}


function RatingDistribution(props){
  const ratingDistributionList = props.ratingDistributionList;
  const isForHybrid = props.isForHybrid;
  return (
    <div className='flex flex-col w-full'>
      {ratingDistributionList.map((ratingDistribution, index) => {
        return(
          <div key={index} className='flex flex-row items-center mb-1'>
            <div className='md:me-2 me-1'>
              {ratingDistribution.rating}
            </div>
            <div className={`${isForHybrid ? 'w-3/4' : 'w-[70%]'}`}>
              <div className='w-full bg-gray-200 h-3 rounded-full'>
                <div
                className='bg-primary h-3 rounded-full' 
                style={{width: `${parseInt(ratingDistribution.count)}%`}}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
