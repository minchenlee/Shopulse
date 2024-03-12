import React from 'react'
import { useState, useRef, useContext, useEffect } from 'react'
import FeatherIcon from 'feather-icons-react'
import Markdown from 'react-markdown'
import ProfileImage from './ProfileImage'

const mdText = 'I found some LG OLED TVs with 4K resolution within your price range of $500 to $1500. Here are a few options for you to consider:\n\n### 1. LG C2 Series 42-Inch Class OLED evo Smart TV OLED42C2PUA, 2022\n   - **Price:** $989.95\n   - **Screen Size:** 42 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Self-lit OLED technology, α9 Gen 5 AI Processor 4K, Filmmaker Mode, Dolby Enhancements, LG Game Optimizer\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Prime Video, Netflix, HBO Max, Apple TV, Disney+, and more\n\n ### 2.  LG C2 Series 48-Inch Class OLED evo Smart TV OLED48C2PUA, 2022\n   - **Price:** $1044.95\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Pixel Level Dimming, Cinema HDR, Room to Room Share, Dynamic Tone Mapping Pro, Wide Viewing Angle\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Netflix, HBO Max, Prime Video, Disney+, Apple TV, Hulu, and more\n\n ### 3. LG C3 Series 48-Inch Class OLED evo Smart TV OLED48C3PUA, 2023\n   - **Price:** $996.99\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** LG OLED evo, Ultra Slim Design, webOS 23 & LG Channels, Dolby Vision + Home Theater, Ultimate Gaming\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** HBO Max, Netflix, Prime Video, Disney Plus, Apple TV, and more\n\nYou can explore these models for detailed specifications and decide which one aligns best with your preferences and budget. Let me know if you need more information or assistance! '


function Message(props){
  const role = props.role || 'assistant';
  const name = role === 'assistant' ? 'Max' : 'You'
  const message = props.message || mdText;
  const imageList = props.imageList || [];

  // custom markdown component
  const customParagraphRenderer = {
    p: ({node, ...props}) => <p className="my-1" {...props} />,
    ol: ({node, ...props}) => <ol className="space-y-6" {...props} />,
  };

  return(
    <div className='w-full mx-auto mb-6 md:max-w-3xl flex flex-row space-x-3 font-nunito text-base text-primary'>
      <ProfileImage role={role}/>
      <div className='flex flex-col w-11/12'>
        <div className='h-[28px] flex items-center font-extrabold text-base'>
          <span>{name}</span>
        </div>
        {imageList.length > 0 && 
          <Carousel imageList={imageList}/>
        }
        <div className='markdown'>
          <Markdown components={customParagraphRenderer}>
            {message}
          </Markdown>
        </div>
      </div>
    </div>
  )
}


function Carousel(props){
  const [isHitStart, setIsHitStart] = useState(true);
  const [isHitEnd, setIsHitEnd] = useState(false);
  const [buttonLeftSlowClose, setButtonLeftSlowClose] = useState(false);
  const [buttonRightSlowClose, setButtonRightSlowClose] = useState(false);

  const imageList = props.imageList || [];
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
      <ImageList imageList={imageList} scrollRef={scrollRef}/>
    </div>
  )
}


function ImageList({imageList, scrollRef}){
  // console.log(imageList);
  return(
    <div 
    ref={scrollRef}
    className='snap-x snap-mandatory relative flex flex-row w-full overflow-scroll gap-5 no-scrollbar scroll-smooth'>
      {imageList.map((image, index) => {
        return <Image key={index} image={image}/>
      })}
    </div>
  )
}


function Image(props){
  const image = props.image || {};
  const name = image.name || '';

  return(
    <div className={`snap-center rounded-xl border-[1px] border-primary w-72 min-w-72 h-52 mb-2 relative`}>
      <img src={image.image} alt={image.name} className='w-full h-full px-3 pt-4 pb-7 object-contain'/>
      <span className='absolute w-full bottom-0 text-sm rounded-b-[11px] text-primary font-nunito font-bold ps-2 py-[2px] truncate'>
        {name}
      </span>
    </div>
  )
}

export default React.memo(Message);
