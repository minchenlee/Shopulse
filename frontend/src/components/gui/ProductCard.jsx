import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react/build/FeatherIcon'
import { StarRow, Star, HollowStar} from './Star'

function ProductCard(props) {
  const productId = props.productId || '65fbe1900d011def30ca0a67';
  const productImageList = props.productImageList || [];
  let productName = props.productName || 'LG UHD UQ75 Series 70” (70UQ7590PUB, 2022)';
  const productPrice = props.productPrice || 497;
  const productRating = props.productRating || 4.2;
  const productReviewCount = props.productReviewCount || 132;
  const forSimilarProducts = props.forSimilarProducts || false;
  let bottomMargin = 20;

  if (productName.length > 50) {
    productName = productName.slice(0, 50) + '...';
  }

  if (forSimilarProducts) {
    bottomMargin = 0;
  }

  const productHeroImage = productImageList[0] || 'https://m.media-amazon.com/images/I/71bdeNqyARL._AC_UY436_QL65_.jpg';
  return(
      <div
      className={`me-9 mb-${bottomMargin} min-w-64 min-h-60 flex flex-col items-start justify-center overflow-hidden`}>
        <Link to={`/gui/products/${productId}`}>
          <img
            src={productHeroImage}
            alt={productName}
            className='w-full rounded-xl px-4 object-contain md:h-48 2xl:h-72 py-4 bg-[#ffffff]'
          />
          <div className='mt-3 font-nunito'>
            <div className='flex flex-row items-center text-xl font-bold mb-1'>
              <p className='text-base me-1'>$</p>
              <p className=''>{productPrice}</p>
            </div>
            <p className='text-base font-semibold text-primary mb-1'>
              {productName}
            </p>
          </div>
          <Rating 
          productRating={productRating}
          productReviewCount={productReviewCount}
          />
        </Link>
      </div>
  );
}


function Rating(props) {
  const productRating = props.productRating;
  const productReviewCount = props.productReviewCount;

  return (
    <div className='flex flex-row items-center'>
      <span className='mr-2 text-gray-600'>{productRating}</span>
      <StarRow rating={productRating} />
      <span className='ml-2 text-gray-600'>{productReviewCount}</span>
    </div>
  );
}

export default ProductCard;








