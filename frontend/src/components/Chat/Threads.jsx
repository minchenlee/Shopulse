import { useState, useRef, useContext, useEffect } from 'react'
import FeatherIcon from 'feather-icons-react'
import dummyResponse from '../../dummy_data/askProduct.json'
import dummayStatus from '../../dummy_data/chatStatus.json'
import Message from './Message'
import MessageStatus from './MessageStatus'

function Threads(){
  const [messageStatus, setMessageStatus] = useState('queued');

  // data fetching logic goes here
  // will be implement later
  // reverse the array to show the latest message at the bottom
  let messageList = [...dummyResponse.data.body.data].reverse();

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

  useEffect(() => {
    setTimeout(() => {
      setMessageStatus(dummayStatus.requires_action.data.status)
    }, 5000);
  
    setTimeout(() => {
      setMessageStatus(dummayStatus.in_progress.data.status)
    }, 10000);
  
    setTimeout(() => {
      setMessageStatus(dummayStatus.completed.data.status)
    }, 15000);
  }, [])

  return (
    <div className='h-full w-full pt-[92px] pb-16 flex flex-col overflow-scroll'>
      {messageList.map((message, index) => {
        return <Message 
        key={index}
        role={message.role} 
        messageRunId={message.run_id}
        message={message.content[0].text.value}
        imageList={message.imageList}
        />
      })}
      {messageStatus !== 'completed' &&
      <MessageStatus name='Max' role='assistant' status={messageStatus}/>
      }
    </div>
  )
}

export default Threads;
