import { useState, useRef, useContext, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams} from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import Zoom from 'react-medium-image-zoom'
import {dotPulse} from 'ldrs'
dotPulse.register()

import ProductCard from '../components/gui/ProductCard'
import { StarRow, Star, HollowStar} from '../components/gui/Star'
import { fetchData } from '../utils/api';



function GUIProductDetail() {
  const { productId } = useParams();
  const [productData, setProductData] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const retrieveProductData = async () => {
    try {
      setIsLoading(true);
      const productData = await fetchData(`/products/${productId}`);
      const similarProducts = await getSimilarProducts(productData, productId);
      setProductData(productData);
      setSimilarProducts(similarProducts);
      // console.log('Product data:', productData);
      // console.log('Similar products:', similarProducts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to retrieve product data:', error);
    }
  }

  useEffect(() => {
    retrieveProductData();
    window.scrollTo(0, 0);
  }, [productId])


  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <div className='min-h-[calc(100vh-78px)] min-w-screen flex flex-col pt-10 pb-20 items-center'>
      <div className='max-w-[1400px] flex flex-row mb-12'>
        <div className='w-1/2'>
          <ImageBlock productData={productData}/>
        </div>
        <div className='w-1/2'>
          <Summary productData={productData}/>
        </div>
      </div>
      <div className='w-full flex flex-col items-center'>
        <div className='max-w-[1216px] xl:w-[1216px] flex flex-col space-y-16 px-4'>
          <SimilarProducts similarProducts={similarProducts}/>
          <Details productDetail={productData?.productDetail}/>
          <Spec productSpec={productData?.productSpec}/>
          <CustomerReview
          rating={productData?.productReview.rating}
          reviewCount={productData?.productReview.reviewCount}
          ratingDistributionList={productData?.productReview.ratingDistributionList}
          reviewList={productData?.productReview.reviewList}
          />
        </div>
      </div>
    </div>
  )
}

function LoadingIndicator(){
  return(
    <div className='z-20 w-full min-h-[calc(100vh-78px)] flex items-center justify-center bg-white text-primary'>
      <l-dot-pulse
        size="54"
        speed="1.3"
      ></l-dot-pulse>
    </div>
  )
}


function ImageBlock(props){
  const { productData } = props;
  const [selectedImage, setSelectedImage] = useState(productData?.productImageList[0]);

  if (!productData) {
    return null;
  }

  const handleImageClick = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  return(
    <div className='w-full h-full relative'>
      <div className='px-16 sticky top-[78px] pt-24 pb-6 flex flex-row items-center'>
        <Gallery productImageList={productData.productImageList} onImageClick={handleImageClick}/>
        <Zoom>
          <img 
          src={selectedImage} 
          alt={productData.productName} 
          className='max-h-[450px] w-11/12 object-contain ms-4'
          />
        </Zoom>
      </div>
    </div>
  );
}


function Gallery(props){
  const { productImageList, onImageClick } = props;

  return(
    <div className='flex flex-col max-h-[450px] w-1/12 min-w-24 overflow-scroll space-y-2'>
      {productImageList.map((image, index) => {
        return(
          <img
            key={index}
            src={image}
            alt={`Product Image ${index}`}
            className='w-24 min-h-24 object-contain p-1 border-[1px] border-primary rounded-md cursor-pointer'
            onClick={() => onImageClick(image)}
          />
        );
      })}
    </div>
  );
}


function Summary(props){
  const productData = props.productData;
  if (!productData) {
    return;
  }

  // Parse product data
  const productImageList = productData.productImageList;
  const productName = productData.productName;
  const productReview = productData.productReview;
  const productPrice = productData.productPrice;
  const productShortSpec = productData.productShortSpec;
  const productFeatures = productData.productFeatures;
  const productDetail = productData.productDetail;
  const productSpec = productData.productSpec;

  return(
    <div className='me-24 flex flex-col space-y-10 font-nunito text-primary'>
      <div className='flex flex-col space-y-4'>
        <h1 className='text-lg font-semibold'>{productName}</h1>
        <Rating 
        rating={productReview.rating}
        reviewCount={productReview.reviewCount}
        />
        <h2 className='text-xl font-extrabold'>${productPrice}</h2>
        <button className='w-[180px] py-2 bg-secondary text-lg font-extrabold rounded-full border-primary border-[1px] hover:shadow-md hover:scale-105 duration-300'>
          Add to cart
        </button>
      </div>
      <ShortSpec productShortSpec={productShortSpec}/>
      <Features productFeatures={productFeatures}/>
    </div>
  )
}


function Rating(props){
  const rating = props.rating;
  const reviewCount = props.reviewCount;

  return(
    <div className='flex flex-row'>
    <div className='flex flex-row items-center'>
      <Star/>
      <Star/>
      <Star/>
      <Star/>
      <HollowStar/>
    </div>
    <div className='ms-4'>
      {rating}
    </div>
    <div className='ms-4'>
      {reviewCount} ratings
    </div>
  </div>
  )
}


function ShortSpec(props){
  const productShortSpec = props.productShortSpec;
  const specTitleList = Object.keys(productShortSpec);

  return(
    <div className='flex flex-col'>
      <h3 className='text-lg font-extrabold mb-4'>At a glance</h3>
      <ul className='w-full'>
        {specTitleList.map((specTitle, index) => {
          return(
            <li key={index} className='text-md mb-4 flex flex-row'>
              <span className='w-1/4 font-bold'>
                {specTitle}
              </span>
              <span className='w-3/4 ps-2'>
                {productShortSpec[specTitle]}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}


function Features(props){
  const productFeatures = props.productFeatures;
  // productFeatures is an object
  const featureTitleList = Object.keys(productFeatures);

  return(
    <div className='flex flex-col'>
      <h3 className='text-lg font-extrabold mb-4'>About this item</h3>
      <ul className='list-disc pl-5'>
        {featureTitleList.map((featureTitle, index) => {
          return(
            <li key={index} className='text-md mb-4'>
              <span className='font-bold'>
                {featureTitle}
              </span>
              <span className=''>
                : {productFeatures[featureTitle]}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}


function SimilarProducts(props){
  const similarProducts = props.similarProducts;
  if (!similarProducts.length) {
    return;
  }

  return(
    <div className='flex flex-col text-primary font-nunito overflow-scroll'>
      <h3 className='text-xl font-extrabold mb-6'>Similar products</h3>
      <div className='flex flex-row gap-4'>
        {similarProducts.map((product, index) => {
          return(
            <ProductCard 
            key={index}
            productId={product.productId}
            productName={product.productName}
            productPrice={product.productPrice}
            productRating={product.productRating}
            productReviewCount={product.productReviewCount}
            productImageList={product.productImageList}
            forSimilarProducts={true}
            />
          )
        })}
      </div>
    </div>
  )
}


function Details(props){
  const productDetail = props.productDetail;
  const [showAllDetails, setShowAllDetails] = useState(false);
  const isFirstRender = useRef(true);
  if(!productDetail){
    return;
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!showAllDetails) {
      const detailElement = document.getElementById('productDetail');
      if (detailElement) {
        const elementPosition = detailElement.offsetTop;
        window.scrollTo({
          top: elementPosition - 100,
          behavior: 'smooth'
        });
      }
    }
  }, [showAllDetails]);

  const detailTitleList = Object.keys(productDetail);
  const detailTitleListLength = detailTitleList.length;
  const displayedDetails = showAllDetails ? detailTitleList : detailTitleList.slice(0, parseInt(detailTitleListLength * 0.5));

  return(
    <div className='flex flex-col font-nunito'>
      <h3 id='productDetail' className='text-xl font-extrabold mb-6'>Product details</h3>
      <ul className='w-2/3'>
        {displayedDetails.map((detail, index) => {
          return(
            <li key={index} className='flex flex-col text-base mb-4'>
              <span className='font-bold'>
                {detail}
              </span>
              <span className=''>
                {productDetail[detail]}
              </span>
            </li>
          )
        })}
      </ul>
      {detailTitleList.length > parseInt(detailTitleListLength * 0.5) && (
        <div className='flex flex-row items-center w-2/3'>
          <span className='w-2/5 border-b-[1px] border-primary'/>
          <button
            onClick={() => setShowAllDetails(!showAllDetails)} 
            className='w-1/5 mx-2 text-lg text-primary font-nunito font-bold py-2'
          >
            {showAllDetails ? 'Hide Details' : 'See All Details'}
          </button>
          <span className='w-2/5 border-b-[1px] border-primary'/>
        </div>
      )}
    </div>
  )
}


function Spec(props) {
  const { productSpec } = props;
  const [showAllSpecs, setShowAllSpecs] = useState(false); // State to toggle view
  const isFirstRender = useRef(true);

  if (!productSpec) {
    return null; // Return null to render nothing if there's no productSpec
  }

  useEffect(() => {
    // disable when it is the first render
    if (isFirstRender.current) {
      // Skip the scroll effect on the first render
      isFirstRender.current = false; // Mark first render as done
      return;
    }

    if (!showAllSpecs) {
      const specElement = document.getElementById('productSpec');
      if (specElement) {
        const elementPosition = specElement.offsetTop;
        window.scrollTo({
          top: elementPosition - 100, // Apply the offset here
          behavior: 'smooth'
        });
      }
    }
  }, [showAllSpecs]);

  const specTitleList = Object.keys(productSpec);
  const displayedSpecs = showAllSpecs ? specTitleList : specTitleList.slice(0, 6);

  return (
    <div className='flex flex-col font-nunito'>
      <h3 id='productSpec' className='text-xl font-extrabold mb-6'>Product specifications</h3>
      <ul className='w-2/3'>
        {displayedSpecs.map((specTitle, index) => (
          <li key={index} className='text-md mb-4 flex flex-row'>
            <span className='w-1/4 font-bold'>
              {specTitle}
            </span>
            <span className='w-3/4 ps-10'>
              {productSpec[specTitle]}
            </span>
          </li>
        ))}
      </ul>
      {specTitleList.length > 6 && (
        <div className='flex flex-row items-center w-2/3'>
          <span className='w-2/5 border-b-[1px] border-primary'/>
          <button
            onClick={() => setShowAllSpecs(!showAllSpecs)} 
            className='w-1/5 mx-2 text-lg text-primary font-nunito font-bold py-2'
          >
            {showAllSpecs ? 'Hide Specs' : 'See All Specs'}
          </button>
          <span className='w-2/5 border-b-[1px] border-primary'/>
        </div>
      )}
    </div>
  );
}


function CustomerReview(props){
  const rating = props.rating;
  const reviewCount = props.reviewCount;
  const ratingDistributionList = props.ratingDistributionList;
  const reviewList = props.reviewList;

  return(
    <div className='flex flex-col font-nunito text-primary'>
      <h3 className='text-xl font-extrabold mb-6'>Customer reviews</h3>
      <div className='h-auto flex flex-row space-x-10'>
        <StatisticBlock 
        rating={rating} 
        reviewCount={reviewCount} 
        ratingDistributionList={ratingDistributionList}
        />
        <ReviewList reviewList={reviewList}/>
      </div>
    </div>
  )
}

function StatisticBlock(props){
  const rating = props.rating;
  const reviewCount = props.reviewCount;
  const ratingDistributionList = props.ratingDistributionList;

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
  return (
    <div className='flex flex-col'>
      {ratingDistributionList.map((ratingDistribution, index) => {
        return(
          <div key={index} className='flex flex-row items-center mb-1'>
            <div className='w-1/4'>
              {ratingDistribution.rating}
            </div>
            <div className='w-3/4'>
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


function ReviewList(props) {
  const { reviewList } = props;
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);

  const handleSeeMoreReviews = () => {
    setVisibleReviewsCount(prevCount => prevCount + 5);
  };

  return (
    <div className='flex flex-col w-2/3'>
      {reviewList.slice(0, visibleReviewsCount).map((review, index) => (
        <Review 
          key={index}
          userName={review.userName}
          rating={review.rating}
          reviewTitle={review.reviewTitle}
          reviewDate={review.reviewDate}
          review={review.review}
        />
      ))}
      {visibleReviewsCount < reviewList.length && (
        <button 
          onClick={handleSeeMoreReviews}
          className='mt-4 self-center bg-secondary text-primary font-nunito font-bold px-6 py-2 rounded-full border-primary border-[1px] hover:shadow-md hover:scale-105 duration-300'
        >
          See More Reviews
        </button>
      )}
    </div>
  );
}


function Review(props){
  const userName = props.userName;
  const rating = props.rating;
  const reviewTitle = props.reviewTitle;
  let reviewDate = props.reviewDate;
  const reviewContent = props.review;
  reviewDate = reviewDate.replace('Reviewed in the United States on ', '');

  return (
    <div className='flex flex-col font-nunito mb-8'>
      <div className='flex flex-row items-center mb-1'>
        <span className='bg-secondary w-7 h-7 rounded-full flex items-center justify-center'/>
        <span className='ms-2 text-base font-medium text-dark-grey'>
          {userName}
        </span>
      </div>
      <div className='flex flex-row items-center mb-1'>
        <StarRow rating={rating}/>
        <span className='ms-2 text-base font-semibold text-primary'>
          {reviewTitle}
        </span>
      </div>
      <span className='text-base text-dark-grey mb-3'>
        {reviewDate}
      </span>
      <p className='text-base text-primary'>
        {reviewContent}
      </p>
    </div>
  )
}



const getSimilarProducts = async(productData, productId) => {
  let price = productData.productPrice;
  let screenSize = parseInt(productData.productShortSpec['Screen Size']);
  let screenType = productData.productShortSpec['Display Technology'];

  const minScreenSize = parseInt(screenSize - screenSize * 0.15);
  const maxScreenSize = parseInt(screenSize + screenSize * 0.15);

  const minPrice = parseInt(price - price * 0.15);
  const maxPrice = parseInt(price + price * 0.15);

  let similarProducts = await fetchData(`/products/filter?minPrice=${minPrice}&maxPrice=${maxPrice}&minScreenSize=${minScreenSize}&maxScreenSize=${maxScreenSize}&screenType=${screenType}&limit=5&fullDetails=false`);

  // Convert the product._id to product.productId
  similarProducts = similarProducts.map(product => {
    product.productId = product._id;
    return product;
  });

  // Filter out the current product
  similarProducts = similarProducts.filter(product => product.productId !== productId);

  // After filtering, if there are 5 similar products, reduce to 4
  if (similarProducts.length === 5) {
    similarProducts.pop();
  }

  return similarProducts;
}






export default GUIProductDetail;
