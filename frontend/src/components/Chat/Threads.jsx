import { useState, useRef, useContext, useEffect, useMemo } from 'react'
import FeatherIcon from 'feather-icons-react'
import { animateScroll } from 'react-scroll';

import { useUserSession } from '../../context/UserSessionContext';

import Chat from '../../content_data/Chat.json'
import dummyResponse from '../../dummy_data/askProduct.json'
import dummayStatus from '../../dummy_data/chatStatus.json'
import Message from './Message'
import MessageStatus from './MessageStatus'

// options for scrolling to bottom
const options = {
  duration: 0,
  containerId: 'thread'
};

function Threads(){
  const { currentMessages, messageStatus, currentEvent} = useUserSession();
  const [isLoading, setIsLoading] = useState(false); // New state to track loading status

  useEffect(() => {
    // Default action is to scroll to the bottom, applicable in all scenarios
    animateScroll.scrollToBottom(options);
  
    // If messageStatus is not 'completed', we are waiting for new messages, so set loading true
    if (messageStatus !== 'completed') {
      setIsLoading(true);
    } 

    if (currentEvent && currentEvent.type === 'messages') {
      // Once message loading is completed or currentMessages changes, set loading false
      setIsLoading(false);
    }

  }, [currentMessages, messageStatus, isLoading]); // Combine all dependencies
  

  // console.log('currentMessages', currentMessages);
  // check if the currentMessages has any key
  if (Object.keys(currentMessages).length === 0) {
    return;
  }

  // if the currentMessages has key, get the messageList
  // reverse the array to show the latest message at the bottom
  // console.log('currentMessages', currentMessages);
  let messageList = [...currentMessages.data.data].reverse();

  // dummy data for testing
  // let messageList = [...dummyResponse.data.data].reverse();

  // parse the metadata to get the imageList
  let imageList = [];

  messageList.map((message) => {
    const metadata = message.metadata;
    // if the metadata is not empty
    if (Object.keys(metadata).length !== 0) {
      // get key value pair from metadata
      const metadataKey = Object.keys(metadata);

      // create a list to store the product name and image url
      // for the filter_products, cause the filter_products has multiple product data
      let nameList = [];
      let imageUrlList = [];
      for (const key of metadataKey) {
        if (key === 'product_name_list') {
          nameList = JSON.parse(metadata[key]);
        }

        if (key.startsWith('img_list_')) {
          imageUrlList = [...imageUrlList, ...JSON.parse(metadata[key])];
        }
      }

      // if the tool_call_name is filter_products, create image and name pair
      if (metadata.tool_call_name === 'filter_products') {
        imageList = imageUrlList.map((image, index) => {
          return {image: image, name: nameList[index]}
        })
      }

      // if the tool_call_name is get_product_details, just include the image
      if (metadata.tool_call_name === 'get_product_details') {
        imageList = imageUrlList.map((image) => {
          return {image: image}
        })
      }

      // add imageList to message
      message.imageList = imageList;
    }
  })

  // if the messageList is empty, show the welcome message
  if (messageList.length === 0) {
    return (
      <WelcomingMessage/>
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
        imageList={message.imageList}
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
    <div id='thread' className='h-full w-full pt-16 pb-16 flex flex-col overflow-scroll'>
      <div className='h-full w-full md:max-w-3xl mx-auto text-primary font-extrabold font-nunito text-3xl text-start'>
        <h1 className=''>Hi there! </h1>
        <h1 className=''>What can I assist you with today?</h1>
        <div className='mt-6 flex flex-row flex-wrap justify-center gap-6'>
          {shortCutTitle.map((title, index) => {
            return <ShortCut key={index} title={title} />
          })}
        </div>
      </div>
    </div>
  ), [shortCutTitle, setUserInput]);
}

export default Threads;
