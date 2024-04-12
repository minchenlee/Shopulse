import {memo, useRef, useEffect} from 'react'
import isEqual from 'react-fast-compare';
import Markdown from 'react-markdown'
import ProfileImage from './ProfileImage'
import { Carousel } from './Carousel'
import StatisticBlock from '../gui/StatisticBlock'

const mdText = 'I found some LG OLED TVs with 4K resolution within your price range of $500 to $1500. Here are a few options for you to consider:\n\n### 1. LG C2 Series 42-Inch Class OLED evo Smart TV OLED42C2PUA, 2022\n   - **Price:** $989.95\n   - **Screen Size:** 42 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Self-lit OLED technology, α9 Gen 5 AI Processor 4K, Filmmaker Mode, Dolby Enhancements, LG Game Optimizer\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Prime Video, Netflix, HBO Max, Apple TV, Disney+, and more\n\n ### 2.  LG C2 Series 48-Inch Class OLED evo Smart TV OLED48C2PUA, 2022\n   - **Price:** $1044.95\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Pixel Level Dimming, Cinema HDR, Room to Room Share, Dynamic Tone Mapping Pro, Wide Viewing Angle\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Netflix, HBO Max, Prime Video, Disney+, Apple TV, Hulu, and more\n\n ### 3. LG C3 Series 48-Inch Class OLED evo Smart TV OLED48C3PUA, 2023\n   - **Price:** $996.99\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** LG OLED evo, Ultra Slim Design, webOS 23 & LG Channels, Dolby Vision + Home Theater, Ultimate Gaming\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** HBO Max, Netflix, Prime Video, Disney Plus, Apple TV, and more\n\nYou can explore these models for detailed specifications and decide which one aligns best with your preferences and budget. Let me know if you need more information or assistance! '


function Message(props){
  const role = props.role || 'assistant';
  const name = role === 'assistant' ? 'Max' : 'You'
  let message = props.message || mdText;
  const productList = props.productList || [];
  let productReview = props.productReview || null;
  const filteringCondition = props.filteringCondition || null;
  const isForHybrid = props.isForHybrid || false;
  const type = productList[0]?.type;
  const isLastMessage = props.isLastMessage;
  const lastMessageRef = props.lastMessageRef;
  const messageRef = useRef(null);

  // Save the last message ref
  useEffect(() => {
    if (isLastMessage) {
      lastMessageRef.current = messageRef.current;
    }
  }, [isLastMessage, lastMessageRef]);

  // Remove system's string from message, so it won't be displayed
  message = message.replace(/<productId>([a-zA-Z0-9]+)<productId>/g, '');

  // custom markdown component
  const customParagraphRenderer = {
    p: ({node, ...props}) => <p className="my-1" {...props} />,
    ul: ({node, ...props}) => <ul className="space-y-2" {...props} />,
    li: ({node, ...props}) => <li className="mt-2" {...props} />,
  };

  return(
    <div
    ref={messageRef}
    className='scroll-mt-16 w-full mx-auto mb-6 md:max-w-3xl flex flex-row space-x-3 font-nunito text-base text-primary'>
      <ProfileImage role={role}/>
      <div className='flex flex-col w-11/12'>
        <div className='h-[28px] flex items-center font-extrabold text-base'>
          <span>{name}</span>
        </div>
        {productList.length > 0 && 
          <Carousel productList={productList}/>
        }
        {/* {productList.length > 0 && isForHybrid && type === 'productDetail' &&
          <Carousel productList={productList}/>
        } */}
        {productReview && 
          <StatisticBlock 
          isForHybrid={isForHybrid}
          rating={productReview.rating}
          reviewCount={productReview.reviewCount}
          ratingDistributionList={productReview.ratingDistributionList}
          />
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

export default memo(Message, isEqual);
