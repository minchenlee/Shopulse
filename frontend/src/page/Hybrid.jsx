import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import Joyride from 'react-joyride';

import Logo from '../svg/logo'
import Threads from '../components/Chat/Threads';
import Modal from '../components/modals/Modal';
import LoginModal from '../components/modals/LoginModal';
import TimesUpModal from '../components/modals/TimesUpModal';
import InstructionModal from '../components/modals/InstructionModal';
import NavButton from '../components/Chat/NavButton';
import HistoryButton from '../components/Chat/HistoryButton';
import UserInput from '../components/Chat/UserInput';
import LoadingIndicator from '../components/Chat/LoadingIndicator';
import Timer from '../components/Timer';

import { useCursorInside } from '../hooks/useCursorInside';
import { useUserSession } from '../context/UserSessionContext';
import { fetchData, postData, deleteData } from '../utils/api';

function HybridPage(){
  const { userID, threadsList, setCurrentThreadID, isLoadingThread, setIsLoadingThread, isLoginModalOpen, setIsLoginModalOpen, isTourStart, setIsTourStart, timerActive, setTimerActive} = useUserSession();

  // control modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  // control whether the Buffer is shown
  const [isBufferShown, setIsBufferShown] = useState(false);
  let userInputWidth = isBufferShown ? 'w-3/4 ps-40' : 'w-full';
  
  // Reset the tour when the joyride is completed
  const handleReset = (data) => {
    // console.log(data);
    if (data.action === 'reset') {
      setIsTourStart(false);
    }

    if (data.index === 6) {
      setIsBufferShown(true);
    }

    if (data.action === 'stop') {
      setIsBufferShown(false);
      if (!timerActive) {
        setTimerActive(true);
      }
    }
  }

  return (
    <div className='h-screen min-w-screen overflow-hidden relative'>
      <div className='z-50 absolute top-[18px] right-4'>
        <Timer/>
      </div>
      <div className='h-full w-full flex flex-row relative'>
        <div className='absolute z-30 w-full h-16 bg-white bg-opacity-65 backdrop-blur-[6px]'/>
        <div className='absolute z-30 h-full ps-8 pt-4 flex flex-col items-start'>
          <span className='shadow-md rounded-full'>
            <Logo/>
          </span>
          <div className='w-40 mt-8 flex flex-col items-start space-y-3'>
            <NavButton text='how to ask?' onclick={toggleModal} className='step-one'/>
            <NavButton text='new chat' onclick={() => createNewThread(userID, threadsList, setCurrentThreadID, setIsLoadingThread)} className='step-two'/>
            <HistoryButton 
            text='history' 
            isLoadingThread={isLoadingThread}
            setIsLoadingThread={setIsLoadingThread}
            className='step-three'
            />
          </div>
        </div>
        {isLoadingThread && <LoadingIndicator/>}
        <Threads isForHybrid={true} isBufferShown={isBufferShown} setIsBufferShown={setIsBufferShown}/>
        <div className={`${userInputWidth} absolute z-40 bottom-0 backdrop-blur-md pb-4 duration-500`}>
          <UserInput className='step-four'/>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <TimesUpModal/>
      <InstructionModal/>
      <ToastContainer/>
      <Joyride 
        steps={steps}
        run={isTourStart}
        continuous={true}
        hideCloseButton={true}
        disableCloseOnEsc={true}
        disableOverlayClose={true}
        callback={handleReset}
        spotlightPadding={4}
        styles={{
          options: {
            primaryColor: '#343434',
            textColor: '#343434',
            zIndex: 1000,
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            borderRadius: 15,
            fontFamily: 'Nunito',
            fontSize: '1rem',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '10px 10px',
          },
          tooltipFooter: {
            marginTop: 0,
          },
          buttonNext: {
            borderRadius: 10,
            padding: '10px 20px',
            margin: '0 0 0 10px',
          },
        }}
      />
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


// React Joyride steps
const steps = [
  {
    target: '.step-one',
    content: 'Simple tips for clearly stating your question or request.',
    disableBeacon: true,
  },
  {
    target: '.step-two',
    content: 'Start a new conversation with our AI assistant.'
  },
  {
    target: '.step-three',
    content: 'View your previous chat logs and conversations.',
  },
  {
    target: '.step-four',
    content: 'Enter your message here to send to Max, our AI assistant.',
  },
  {
    target: '.step-five',
    content: 'View the task instructions and scenario here.',
  },
  {
    target: '.step-six',
    content: 'Launch the interactive website tour for a quick walkthrough.',
  },
  {
    target: '.step-seven',
    content: 'Track your task time here, don\'t worry, it will start after you finish this tour.',
  },
  {
    target: '.step-eight',
    content: 'Click here to open or close the Buffer, which is a space for you to store products you are interested in and access their details or reviews later.',
  },
  {
    target: '.step-nine',
    content: 'You can view the filtering condition that Max is using to recommend products to you here.',
  },
  {
    target: '.step-ten',
    content: 'You can view the products that Max has recommended to you here, and click on the button below to view more details or reviews.',
  },
];


export default HybridPage


