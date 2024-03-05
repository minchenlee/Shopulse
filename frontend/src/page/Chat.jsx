import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';

import Logo from '../svg/logo'
import Threads from '../components/Chat/Threads';
import Message from '../components/Chat/Message';
import Modal from '../components/modals/Modal';
import LoginModal from '../components/modals/LoginModal';

function ChatPage(){
  // control modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  // control login modal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const toggleLoginModal = () => setIsLoginModalOpen(!isLoginModalOpen);

  return (
    <div className='h-screen min-w-screen overflow-hidden'>
      <div className='h-full w-full flex flex-row'>
        <div className='absolute z-30 w-full h-16 bg-white bg-opacity-65 backdrop-blur-[6px]'/>
        <div className='absolute z-30 h-full ps-8 pt-4 flex flex-col items-start'>
          <span className='shadow-md rounded-full'>
            <Logo/>
          </span>
          <div className='w-40 mt-8 flex flex-col items-start space-y-3'>
            <NavButton text='how to ask?' onclick={toggleModal}/>
            <NavButton text='new chat'/>
            <NavButton text='history'/>
          </div>
        </div>
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


function NavButton(props){
  const text = props.text
  const onclick = props.onclick

  return(
    <button 
    onClick={onclick}
    className='w-full text-start text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap'>
      {text}
    </button>
  )
}

function UserInput(){
  const textAreaRef = useRef(null);
  const [text, setText] = useState("");

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Prevent default behavior of Enter key in a textarea which is to insert a new line
      event.preventDefault();
      // Call a function to handle the Enter key press
      if (text !== "") {
        console.log("Enter was pressed. Current text value: ", text);
      } else {
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

  // Auto resize the textarea
  useEffect(() => {
    if (textAreaRef.current) {
      // Reset height to 'auto' to shrink the size when text is deleted
      textAreaRef.current.style.height = 'auto';
      // Set the height to the scrollHeight or a minimum of 48px
      textAreaRef.current.style.height = `${Math.max(textAreaRef.current.scrollHeight, 48)}px`;
    }
  }, [text]);

  return(
    <div className='mx-auto md:max-w-3xl min-w-[768px] flex items-center border-primary relative'>
      <textarea 
      ref={textAreaRef}
      rows={1}
      className='bg-white peer no-scrollbar m-0 w-full border-primary border-[1px] max-h-96 placeholder-primary rounded-2xl ps-4 pe-16 resize-none max-h-25 py-[10px] focus:outline-none focus:ring-4 focus:ring-silver transition-all duration-300 placeholder:font-nunito placeholder:text-silver placeholder:font-bold'
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder='Message Max'
      />
      <button className='absolute bottom-1 right-2 bg-secondary h-[40px] w-[40px] rounded-full flex justify-center items-center opacity-75 duration-300 peer-focus:opacity-100 peer-focus:shadow-sm peer-focus:border-[1px] border-dark-grey'>
        <FeatherIcon icon='send' className='text-primary px-[1px]' size='28px' strokeWidth='0.15rem'/>
      </button>
    </div>
  )
}

// class="overflow-hidden [&:has(textarea:focus)]:border-token-border-xheavy [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)] flex flex-col w-full dark:border-token-border-medium flex-grow relative border border-token-border-medium dark:text-white rounded-2xl bg-token-main-surface-primary"

// class="m-0 w-full resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 dark:bg-transparent max-h-25 py-[10px] pr-10 md:py-3.5 md:pr-12 placeholder-black/50 dark:placeholder-white/50 pl-10 md:pl-[55px]"

export default ChatPage
