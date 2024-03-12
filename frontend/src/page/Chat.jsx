import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import {dotPulse} from 'ldrs'
dotPulse.register()

import Logo from '../svg/logo'
import Threads from '../components/Chat/Threads';
import Message from '../components/Chat/Message';
import Modal from '../components/modals/Modal';
import LoginModal from '../components/modals/LoginModal';

import {useCursorInside} from '../hooks/useCursorInside';
import { useUserSession } from '../context/UserSessionContext';
import { fetchData, postData, deleteData } from '../utils/api';

function ChatPage(){
  const { userID, threadsList, setCurrentThreadID, isLoadingThread, setIsLoadingThread} = useUserSession();

  // control modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  // control login modal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const toggleLoginModal = () => setIsLoginModalOpen(!isLoginModalOpen);

  return (
    <div className='h-screen min-w-screen overflow-hidden'>
      <div className='h-full w-full flex flex-row relative'>
        <div className='absolute z-30 w-full h-16 bg-white bg-opacity-65 backdrop-blur-[6px]'/>
        <div className='absolute z-30 h-full ps-8 pt-4 flex flex-col items-start'>
          <span className='shadow-md rounded-full'>
            <Logo/>
          </span>
          <div className='w-40 mt-8 flex flex-col items-start space-y-3'>
            <NavButton text='how to ask?' onclick={toggleModal}/>
            <NavButton text='new chat' onclick={() => createNewThread(userID, threadsList, setCurrentThreadID, setIsLoadingThread)}/>
            <HistoryButton 
            text='history' 
            isLoadingThread={isLoadingThread}
            setIsLoadingThread={setIsLoadingThread}
            />
          </div>
        </div>
        {isLoadingThread && <LoadingIndicator/>}
        <Threads/>
        <div className='absolute z-40 inset-x-3 bottom-0 backdrop-blur-md pb-4'>
          <UserInput/>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ToastContainer/>
    </div>
  )
}


// create a new thread
const createNewThread = async(userID, threadsList, setCurrentThreadID, setIsLoadingThread) => {
  try {
    if (threadsList.length === 3) {
      toast.warn('You can only have 3 active threads at a time', {
        className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: "top-center",
        autoClose: true,
        hideProgressBar: true,
        closeButton: false,
      });
      return;
    }
    
    setIsLoadingThread(true);
    const response = await postData('/chat/threads', { userId: userID });
    setCurrentThreadID(response.threadId);
  } catch (error) {
    setIsLoadingThread(false);
    toast.warn(error.response.data.error, {
      className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
      position: "top-center",
      autoClose: true,
      hideProgressBar: true,
      closeButton: false,
    });
  }
}


function NavButton(props){
  const text = props.text
  const onclick = props.onclick

  return(
    <button 
    onClick={onclick}
    className='w-auto text-start text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap'>
      {text}
    </button>
  )
}


function HistoryButton(props){
  const { 
    threadsList, currentThreadID, 
    setCurrentThreadID, currentMessages,
    isLoadingThread, setIsLoadingThread
  } = useUserSession();
  let text = props.text;
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
    <div className='w-full'>
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


function UserInput(){
  const {currentThreadID, currentMessages, setCurrentMessages, userInput, setUserInput} = useUserSession();
  const textAreaRef = useRef(null);

  // Auto resize the textarea
  useEffect(() => {
    if (textAreaRef.current) {
      // Reset height to 'auto' to shrink the size when text is deleted
      textAreaRef.current.style.height = 'auto';
      // Set the height to the scrollHeight or a minimum of 48px
      textAreaRef.current.style.height = `${Math.max(textAreaRef.current.scrollHeight, 48)}px`;
    }
  }, [userInput]);

  // Update the text state when the user types
  const handleChange = (event) => {
    setUserInput(event.target.value);
  };

  // Send the message to the server
  const handleSubmit = async() => {
    if (userInput !== '') {
      // console.log("Send button was clicked. Current text value: ", text);
      // Send the message to the server
      try {
        // Create a new message object
        const message = {
          role: 'user',
          run_id: 'run_temp',
          imageList: [],
          metadata: {},
          content: [
            {
              text: {
                value: userInput
              }
            }
          ]
        }

        // Add the new message to the currentMessages
        let newMessages = {...currentMessages};
        newMessages.data.body.data.unshift(message);
        newMessages.data.data.unshift(message);
        setCurrentMessages(newMessages);

        // clear the text area
        setUserInput('');

        await postData('/chat/messages', {
          threadId: currentThreadID,
          message: userInput
        });

      } catch (error) {
        // console.error('Failed to send the message:', error);
        toast.error('Failed to send the message', {
          className: 'bg-white backdrop-blur-lg bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
          position: "top-center",
          autoClose: false,
          hideProgressBar: true,
          closeButton: true,
        });
      }
    }
  }

  // Handle the Enter key to submit the message
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Prevent default behavior of Enter key in a textarea which is to insert a new line
      event.preventDefault();
      handleSubmit();

      // If userInput is empty, show a toast message
      if (userInput === '') {
        toast('Use Shift + Enter for a line break.', {
          className: 'bg-secondary font-russoOne text-primary rounded-xl border-grey border-[1px]',
          position: "top-center",
          autoClose: 2500,
          hideProgressBar: true,
          closeButton: false,
        });
      }
    }
  };
  
  return(
    <div className='mx-auto md:max-w-3xl min-w-[768px] flex items-center border-primary relative'>
      <textarea 
      ref={textAreaRef}
      rows={1}
      className='font-nunito bg-white peer no-scrollbar m-0 w-full border-primary border-[1px] max-h-96 placeholder-primary rounded-2xl ps-4 pe-16 resize-none max-h-25 py-[10px] focus:outline-none focus:ring-4 focus:ring-silver transition-all duration-300 placeholder:font-nunito placeholder:text-grey placeholder:font-bold'
      value={userInput}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder='Message Max'
      />
      <button
      onClick={handleSubmit}
      className='absolute bottom-1 right-2 bg-secondary h-[40px] w-[40px] rounded-full flex justify-center items-center opacity-75 duration-300 peer-focus:opacity-100 peer-focus:shadow-sm peer-focus:border-[1px] border-dark-grey'>
        <FeatherIcon icon='send' className='text-primary px-[1px]' size='28px' strokeWidth='0.15rem'/>
      </button>
    </div>
  )
}

function LoadingIndicator(){
  return(
    <div className='z-20 absolute inset-0 w-full h-full flex items-center justify-center bg-white text-primary'>
      <l-dot-pulse
        size="54"
        speed="1.3"
      ></l-dot-pulse>
    </div>
  )
}

export default ChatPage
