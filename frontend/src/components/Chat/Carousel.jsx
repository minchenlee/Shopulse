import { useState, useRef, useContext, useEffect } from 'react'
import FeatherIcon from 'feather-icons-react'
import Zoom from 'react-medium-image-zoom'

function Carousel(props){
  const [isHitStart, setIsHitStart] = useState(true);
  const [isHitEnd, setIsHitEnd] = useState(false);
  const [buttonLeftSlowClose, setButtonLeftSlowClose] = useState(false);
  const [buttonRightSlowClose, setButtonRightSlowClose] = useState(false);

  const productList = props.productList || [];
  const scrollRef = useRef(null);
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft -= 200;
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += 200;
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (scrollRef.current) {
        // if the scroll is at the end, set isHitEnd to true
        if (scrollRef.current.scrollLeft + scrollRef.current.clientWidth + 3 > scrollRef.current.scrollWidth) {
          setIsHitEnd(true);
          setButtonRightSlowClose(true);
        } else {
          setIsHitEnd(false);
          setButtonRightSlowClose(false);
        }

        // if the scroll is at the beginning, set isHitStart to true
        if (scrollRef.current.scrollLeft < 3) {
          setIsHitStart(true);
          setButtonLeftSlowClose(true);
        } else {
          setIsHitStart(false);
          setButtonLeftSlowClose(false);
        }
      }
    }

    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', onScroll);
    }

    // Check if scrollRef.current exists before trying to remove the event listener
    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('scroll', onScroll);
      }
    };
  }, [scrollRef]);
  

  return(
    <div className='relative mt-2'>
      <button
        onClick={scrollLeft}
        className={`${isHitStart && 'opacity-0'} ${buttonLeftSlowClose && 'invisible'} w-[30px] h-[30px] absolute z-[15] left-2 top-1/2 -translate-y-[15px] text-primary cursor-pointer bg-secondary rounded-full border-primary border-[1px] flex items-center justify-center shadow:md hover:shadow-xl hover:scale-110 duration-300`} >
        <FeatherIcon icon='chevron-left' size='24px' strokeWidth={4}/>
      </button>
      <button
      onClick={scrollRight}
      className={`${isHitEnd && 'opacity-0'} ${buttonRightSlowClose && 'invisible'} w-[30px] h-[30px] absolute z-[15] right-2 top-1/2 -translate-y-[15px] text-primary cursor-pointer bg-secondary rounded-full border-primary border-[1px] flex items-center justify-center shadow:md hover:shadow-xl hover:scale-110 duration-300 transition-all`}>
        <FeatherIcon icon='chevron-right' size='24px' strokeWidth={4}/>
      </button>
      <ImageList productList={productList} scrollRef={scrollRef}/>
    </div>
  )
}

function ImageList({productList, scrollRef}){
  // console.log(productList);
  return(
    <div 
    ref={scrollRef}
    className='snap-x snap-mandatory relative flex flex-row w-full overflow-scroll gap-5 no-scrollbar scroll-smooth'>
      {productList.map((product, index) => {
        return <Image key={index} product={product}/>
      })}
    </div>
  )
}


function Image(props){
  const product = props.product || {};
  const name = product.name || '';

  return(
    <Zoom>
      <div className={`snap-center rounded-xl border-[1px] border-primary w-72 min-w-72 h-56 mb-2 relative flex items-center justify-center bg-white`}>
        <img src={product.image} alt={name} className='w-full max-h-[80%] px-3  object-contain'/>
        <span className='absolute w-full bottom-0 text-sm rounded-b-[11px] text-primary font-nunito font-bold ps-2 py-[2px] mt-4 truncate'>
          {name}
        </span>
      </div>
    </Zoom>
  )
}

export {Carousel, Image}

