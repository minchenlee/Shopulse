import { useState, useRef, useContext, useEffect } from 'react'
import { useUserSession } from '../../context/UserSessionContext'
import { useCursorInside } from '../../hooks/useCursorInside'
import FeatherIcon from 'feather-icons-react';
import { fetchData, postData, deleteData } from '../../utils/api';

export default function HistoryButton(props){
  const { 
    threadsList, currentThreadID, 
    setCurrentThreadID, currentMessages,
    isLoadingThread, setIsLoadingThread
  } = useUserSession();
  let text = props.text;
  const className = props.className;
  // console.log(threadsList);

  // State to track if the list is expanded
  const [isExpanded, setIsExpanded] = useState(false); 
  const toggleList = () => {
    setIsExpanded(!isExpanded); // Toggle the expanded state
  };

  // When the currentMessages changes, set is loading thread to false
  useEffect(() => {
    isLoadingThread && setIsLoadingThread(false)
  }, [currentMessages]);

  return(
    <div className={`w-full  ${className}`}>
    <button 
      onClick={toggleList} // Call the toggle function when button is clicked
      className='w-auto flex flex-row items-center text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap'
    >
      <span className='me-1'>{text}</span>
      <FeatherIcon 
        icon='chevron-down' 
        size='24px' 
        strokeWidth={4} 
        className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
      />
    </button>
    <div className={`mt-2 flex flex-col items-start transition-all duration-300 ${isExpanded ? 'opacity-100': 'opacity-0 invisible'}`}>
      {Object.keys(threadsList).map((key, index) => {
        return <ChatHistory key={index} updatedAt={threadsList[key].updatedAt} threadId={threadsList[key].threadId}/>
      })}
    </div>
  </div>
  )
}


function ChatHistory(props){
  const { 
    threadsList, currentThreadID, 
    setCurrentThreadID, currentMessages,
    isLoadingThread, setIsLoadingThread
  } = useUserSession();

  // the delete confirmation tooltip
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  let updatedAt = props.updatedAt
  const threadId = props.threadId;

  // Convert the date to local date and time
  const convertToLocalDate = (date) => {
    const convertedDate = new Date(date);
    return convertedDate.toLocaleDateString();
  }
  const convertToLocalTime = (date) => {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const convertedDate = new Date(date);
    return convertedDate.toLocaleTimeString([], options);
  };

  const date = convertToLocalDate(updatedAt);
  const time = convertToLocalTime(updatedAt);

  // When the button is clicked, check if the threadId is different from the currentThreadID
  // If it is different, set the currentThreadID to the threadId
  // This prevent unnecessary loading of the same thread
  const onClick = () => {
    if (threadId !== currentThreadID) {
      setIsLoadingThread(true);
      setCurrentThreadID(threadId);
    }
  }
  return (
    <div className='cursor-pointer mb-2 w-full h-full flex flex-row items-center justify-center text-grey hover:text-primary'>
      <button 
      onClick={onClick}
      className='w-full flex flex-row text-start font-russoOne duration-150'>
        <span className='text-base w-1/2'>{date}</span>
        <span className='text-base w-1/2 font-extrabold font-nunito ms-4'>{time}</span>
      </button>
      <button 
      onClick={() => setIsConfirmOpen(!isConfirmOpen)}
      className='w-auto relative duration-150 hover:scale-110 hover:bg-secondary rounded-full'>
        <FeatherIcon className='ms-auto' icon='trash' size='18px' strokeWidth={3}/>
        <ConfirmToolTip threadId={threadId} isConfirmOpen={isConfirmOpen} setIsConfirmOpen={setIsConfirmOpen}/>
      </button>
    </div>
  )
}

function ConfirmToolTip(props){
  const {userID, setCurrentThreadID, threadsList, setThreadsList, updateThreadsList, setIsLoadingThread} = useUserSession();
  const threadId = props.threadId;
  const isConfirmOpen = props.isConfirmOpen;
  const setIsConfirmOpen = props.setIsConfirmOpen;
  const { isCursorInside, handleMouseEnter, handleMouseLeave } = useCursorInside();

  useEffect(() => {
    if (isCursorInside) {
      setIsConfirmOpen(true);
    } else {
      setIsConfirmOpen(false);
    }
  }, [isCursorInside]);

  return(
    <div 
    className={`text-sm font-russoOne px-1 py-1 break-keep top-0 -right-1 -translate-y-2 absolute bg-secondary border-primary border-[1px] rounded-lg transition-opacity duration-500 ${isConfirmOpen ? 'opacity-100 w-40' : 'invisible opacity-0 w-0'}`}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onClick={() => handleDelete(userID, threadId, threadsList, setCurrentThreadID, updateThreadsList, setIsLoadingThread)}
    >
      Click again to delete
    </div>
  )
}

const handleDelete = async(userID, threadId, threadsList, setCurrentThreadID, updateThreadsList, setIsLoadingThread) => {
  try {
    setIsLoadingThread(true);
    await deleteData(`/chat/threads?threadId=${threadId}&userId=${userID}`);
    await updateThreadsList();

    // find the matching thread and remove it from the list
    let newThreadsList = [...threadsList];
    newThreadsList = newThreadsList.filter((thread) => thread.threadId !== threadId);      

    // if newThreadsList is not empty, set the currentThreadID to the first thread
    if (Object.keys(newThreadsList).length !== 0) {
      setCurrentThreadID(newThreadsList[0].threadId);
    } else {
      createNewThread(userID, threadsList, setCurrentThreadID, setIsLoadingThread);
    }

  } catch (error) {
    console.error('Failed to delete the thread:', error);
    toast.error('Failed to delete the thread', {
      className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
      position: "top-center",
      autoClose: false,
      hideProgressBar: true,
      closeButton: true,
    });
  }
}

