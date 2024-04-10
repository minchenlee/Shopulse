import { useState, useRef, useContext, useEffect, useMemo, memo } from 'react'
import FeatherIcon from 'feather-icons-react'
import { useUserSession } from '../../context/UserSessionContext';
import Zoom from 'react-medium-image-zoom'

import Chat from '../../content_data/Chat.json'
import dummyResponse from '../../dummy_data/askProduct.json'
import dummayStatus from '../../dummy_data/chatStatus.json'
import Message from './Message'
import MessageStatus from './MessageStatus'
import Buffer from '../hybrid/Buffer'

// options for scrolling to bottom
const options = {
  duration: 0,
  containerId: 'thread'
};

function Threads(props){
  const { currentMessages, messageStatus, currentEvent, lastMessageRef} = useUserSession();
  const [isLoading, setIsLoading] = useState(false); // New state to track loading status
  const isForHybrid = props.isForHybrid || false; // To control the thread component's look

  // To control the buffer component's look
  const isBufferShown = props.isBufferShown || false; 
  const setIsBufferShown = props.setIsBufferShown

  let messageWidth = isBufferShown ? 'w-3/4 ps-40' : 'w-full';
  let bufferWidth = isBufferShown ? 'w-1/4 lg:max-w-[380px] 2xl:max-w-full' : 'w-0';

  let allProductList = [];
  useEffect(() => {
    // Default action is to scroll to the last message, applicable in all scenarios
    const lastMessageRefCurrent = lastMessageRef.current;
    if (lastMessageRefCurrent) {
      lastMessageRefCurrent.scrollIntoView({ behavior: 'smooth', block: 'start'});
    }
  
    // If messageStatus is not 'completed', we are waiting for new messages, so set loading true
    if (messageStatus !== 'completed') {
      setIsLoading(true);
    } 

    if (currentEvent && currentEvent.type === 'messages') {
      // Once message loading is completed or currentMessages changes, set loading false
      setIsLoading(false);
      const latestMessage = currentMessages.data.data[0];
      if (latestMessage.metadata.tool_call_name === 'filter_products' && isForHybrid) {
        setIsBufferShown(true);
      }
    }
  }, [currentMessages, messageStatus, isLoading]); // Combine all dependencies

  // console.log('currentMessages', currentMessages);
  // check if the currentMessages has any key
  if (Object.keys(currentMessages).length === 0) {
    return;
  }


  // dummy data for testing
  // let messageList = [...dummyResponse.data.data].reverse();

  // if the currentMessages has key, get the messageList
  // reverse the array to show the latest message at the bottom
  // console.log('currentMessages', currentMessages);
  let messageList = [...currentMessages.data.data].reverse();
  let filteringCondition; // To store the filtering condition

  // parse the metadata to get the productList
  messageList.map((message) => {
    let productList = [];
    const metadata = message.metadata;
    // if the metadata is not empty
    if (Object.keys(metadata).length !== 0) {
      // Get the filtering condition, iterate through the metadata
      // The last message which has the filtering condition will be used
      if (metadata.filtering_condition) {
        filteringCondition = JSON.parse(metadata.filtering_condition);
      }

      // console.log(metadata);
      // get key value pair from metadata
      const metadataKey = Object.keys(metadata);

      // create a list to store the product name and image url
      // for the filter_products, cause the filter_products has multiple product data
      let idList = [];
      let nameList = [];
      let imageUrlList = [];
      let priceList = [];
      let ratingList = [];
      let reviewCountList = [];

      for (const key of metadataKey) {
        if (key === 'product_id_list') {
          idList = JSON.parse(metadata[key]);
        }

        if (key === 'product_name_list') {
          nameList = JSON.parse(metadata[key]);
        }

        if (key.startsWith('img_list_')) {
          imageUrlList = [...imageUrlList, ...JSON.parse(metadata[key])];
        }

        if (key === 'product_price_list') {
          priceList = JSON.parse(metadata[key]);
        }

        if (key === 'product_rating_list') {
          ratingList = JSON.parse(metadata[key]);
        }

        if (key === 'product_review_count_list') {
          reviewCountList = JSON.parse(metadata[key]);
        }  
      }

      // if the tool_call_name is filter_products, create image and name pair
      if (metadata.tool_call_name === 'filter_products') {
        productList = imageUrlList.map((image, index) => {
          return {
            image: image, 
            id: idList[index],
            name: nameList[index], 
            price: priceList[index],
            rating: ratingList[index],
            reviewCount: reviewCountList[index],
            type: 'product'
          }
        })
      }

      // if the tool_call_name is get_product_details, just include the image
      if (metadata.tool_call_name === 'get_product_details') {
        productList = imageUrlList.map((image) => {
          return {image: image, type: 'productDetail'}
        })
      }

      // add productList to message
      message.productList = productList;
      let newProductImageList = [...allProductList, ...productList]
      newProductImageList = newProductImageList.filter((image) => {return image.type === 'product'});
      allProductList = newProductImageList
    }
  })
  
  // if the messageList is empty, show the welcome message
  if (messageList.length === 0) {
    return (
      <div className='flex flex-row h-full w-full'>
        <div className={`h-full ${messageWidth} pt-[92px] pb-20 flex flex-col overflow-scroll duration-500 relative`}>
          <WelcomingMessage/>
        </div>
        {isForHybrid &&
          <>
            <span className='z-30 relative'>
              <button
              onClick={() => setIsBufferShown(!isBufferShown)}
              className='step-eight w-20 h-20 opacity-80 bg-secondary text-primary font-nunito font-bold rounded-full ps-2 flex items-center border-primary border-[1px] shadow-md hover:shadow-xl hover:scale-110 hover:opacity-100 transition-all duration-300 absolute top-1/2 right-0 translate-x-1/2'
              >
                {isBufferShown ? 
                  <FeatherIcon icon='chevron-right' size='36px' strokeWidth={4}/>
                  :
                  <FeatherIcon icon='chevron-left' size='36px' strokeWidth={4}/>
                }
              </button>
            </span>
            <div 
            className={`z-40 ${bufferWidth} pt-20 bg-white border-grey border-l-[1px] duration-500 shadow-[inset_1px_0px_22px_-1px_rgba(0,0,0,0.2)]`}>
              <Buffer 
              productList={allProductList} 
              isBufferShown={isBufferShown} 
              filteringCondition={filteringCondition}
              />
            </div>
          </>
        }
      </div>
    )
  }

  // If the thread is used in the hybrid page, return following component
  if (isForHybrid){
    return (
      <div className='flex flex-row h-full w-full'>
        <div
          id='thread'
          className={`h-full ${messageWidth} pt-[92px] pb-20 flex flex-col overflow-scroll duration-500 relative`}>
          {messageList.map((message, index) => {
            return <Message 
            key={index}
            role={message.role} 
            messageRunId={message.run_id}
            message={message.content[0].text.value}
            productList={message.productList}
            productReview={message.metadata.product_review && JSON.parse(message.metadata.product_review)}
            isForHybrid={isForHybrid}
            isLastMessage={index === messageList.length - 1}
            lastMessageRef={lastMessageRef}
            />
          })}
          {isLoading && <MessageStatus name='Max' role='assistant' status={messageStatus}/>}
        </div>
        <span className='z-30 relative step-eight'>
          <button
          onClick={() => setIsBufferShown(!isBufferShown)}
          className='w-20 h-20 opacity-80 bg-secondary text-primary font-nunito font-bold rounded-full ps-2 flex items-center border-primary border-[1px] shadow-md hover:shadow-xl hover:scale-110 hover:opacity-100 transition-all duration-300 absolute top-1/2 right-0 translate-x-1/2'
          >
            {isBufferShown ? 
              <FeatherIcon icon='chevron-right' size='36px' strokeWidth={4}/>
              :
              <FeatherIcon icon='chevron-left' size='36px' strokeWidth={4}/>
            }
          </button>
        </span>
        <div 
        className={`z-40 ${bufferWidth} pt-20 bg-white border-grey border-l-[1px] duration-500 shadow-[inset_1px_0px_22px_-1px_rgba(0,0,0,0.2)]`}>
          <Buffer 
          productList={allProductList} 
          isBufferShown={isBufferShown} 
          filteringCondition={filteringCondition}
          />
        </div>
      </div>
    )
  }


  return (
    <div
    id='thread'
    className='h-full w-full pt-[92px] pb-20 flex flex-col overflow-scroll'>
      {messageList.map((message, index) => {
        return <Message 
        key={index}
        role={message.role} 
        messageRunId={message.run_id}
        message={message.content[0].text.value}
        productList={message.productList}
        isLastMessage={index === messageList.length - 1}
        lastMessageRef={lastMessageRef}
        />
      })}
      {isLoading && <MessageStatus name='Max' role='assistant' status={messageStatus}/>}
    </div>
  )
}


function WelcomingMessage() {
  const { setUserInput } = useUserSession();
  const promptTemplate = useMemo(() => Chat.PromptTemplate, []); // Memoize the prompt template
  const shortCutTitle = useMemo(() => Object.keys(promptTemplate), [promptTemplate]); // Memoize the shortcut titles

  function ShortCut(props) {
    const title = props.title;
    const prompt = promptTemplate[title];

    // When the button is clicked, set the text to the prompt
    const onClick = () => {
      setUserInput(prompt);
    }

    return (
      <button
        onClick={onClick}
        className='w-60 h-60 px-4 py-auto bg-secondary bg-opacity-50 backdrop-blur-md text-primary font-nunito font-extrabold text-start text-[22px] rounded-2xl transtion-all duration-500 hover:shadow-md hover:scale-[1.02] border-2 border-grey'>
        {title}
      </button>
    )
  }

  return useMemo(() => (
    <div id='thread' className={`h-full w-full pt-16 pb-16 flex flex-col overflow-scroll`}>
      <div className='h-full w-full flex flex-col items-start justify-center md:max-w-3xl mx-auto text-primary font-extrabold font-nunito text-3xl text-start'>
        <h1 className=''>Hi there! </h1>
        <h1 className=''>What can I assist you with today?</h1>
        {/* <div className='mt-6 flex flex-row flex-wrap justify-center gap-6'>
          {shortCutTitle.map((title, index) => {
            return <ShortCut key={index} title={title} />
          })}
        </div> */}
      </div>
    </div>
  ), [shortCutTitle, setUserInput]);
}


export default Threads;
