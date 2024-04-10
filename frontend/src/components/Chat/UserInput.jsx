import { useState, useRef, useContext, useEffect } from 'react'
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import { useUserSession } from '../../context/UserSessionContext'
import { fetchData, postData, deleteData } from '../../utils/api';

export default function UserInput(props){
  const {currentThreadID, currentMessages, setCurrentMessages, userInput, setUserInput, textAreaRef, sendMessageButtonRef, lastMessageRef} = useUserSession();
  const [isLastMessageVisible, setIsLastMessageVisible] = useState(false); // New state to track visibility status
  const className = props.className;

  // Auto resize the textarea
  useEffect(() => {
    if (textAreaRef.current) {
      // Reset height to 'auto' to shrink the size when text is deleted
      textAreaRef.current.style.height = 'auto';
      // Set the height to the scrollHeight or a minimum of 48px
      textAreaRef.current.style.height = `${Math.max(textAreaRef.current.scrollHeight, 48)}px`;
    }
  }, [userInput]);


  // Check if the lastMessageRef is visible in the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLastMessageVisible(entry.isIntersecting);
      },
      { root: null, threshold: 0.1 } // Adjust the threshold as needed
    );

    if (lastMessageRef.current) {
      observer.observe(lastMessageRef.current);
    }

    return () => {
      if (lastMessageRef.current) {
        observer.unobserve(lastMessageRef.current);
      }
    };
  }, [currentMessages]);


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
    <div className={`mx-auto md:max-w-3xl min-w-[768px] flex items-center border-primary relative ${className}`}>
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
      ref={sendMessageButtonRef}
      onClick={handleSubmit}
      className='absolute bottom-1 right-2 bg-secondary h-[40px] w-[40px] rounded-full flex justify-center items-center opacity-75 duration-150 peer-focus:opacity-100 peer-focus:border-[1px] border-dark-grey hover:opacity-100 hover:scale-105 hover:shadow-md'>
        <FeatherIcon icon='send' className='text-primary px-[1px]' size='28px' strokeWidth='0.15rem'/>
      </button>
      {!isLastMessageVisible && 
        <button 
        onClick={() => lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start'})}
        className='absolute bottom-[60px] right-1/2 translate-x-1/2 w-8 h-8 bg-secondary text-primary border-[1px] border-primary font-nunito font-bold rounded-full flex items-center justify-center shadow-md opacity-50 hover:opacity-100 hover:shadow-xl hover:scale-110 transition-all duration-300'>
          <FeatherIcon icon='chevron-down' strokeWidth={4}/>
        </button>
      }
    </div>
  )
}
