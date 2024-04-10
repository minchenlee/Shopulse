import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchData, postData } from '../utils/api';
const baseURL = import.meta.env.VITE_API_BASE_URL;

// Create context
const UserSessionContext = createContext();

// Context provider component
export function UserSessionProvider({ children }) {
  // CUI state
  const [userID, setUserID] = useState(null);
  const [currentThreadID, setCurrentThreadID] = useState('');
  const [threadsList, setThreadsList] = useState({});
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentMessages, setCurrentMessages] = useState({});
  const [messageStatus, setMessageStatus] = useState('completed');
  const [userInput, setUserInput] = useState('');

  //GUI state
  const [productDataList, setProductDataList] = useState();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Gereral state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);  // control login modal
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [isTimesUp, setIsTimesUp] = useState(false);
  const [isTourStart, setIsTourStart] = useState(false);
  const [timerActive, setTimerActive] = useState(false); // State to control timer activation
  const [timeLeft, setTimeLeft] = useState(720);
  // const [timeLeft, setTimeLeft] = useState(30); // For testing purpose
  const storedTime = localStorage.getItem('SHOPULSE_TIMER');

  // useRef
  const textAreaRef = useRef(null);
  const sendMessageButtonRef = useRef(null);
  const lastMessageRef = useRef(null);

  // General functions
  useEffect(() => {
    if (storedTime) {
      setTimerActive(true);
      setTimeLeft(parseInt(storedTime));
    }
  }, [storedTime]);


  useEffect(() => {
    const localStorage = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
    if (Object.keys(localStorage).includes('userID')) {
      setUserID(localStorage.userID);
    }
  }, []);

  // Set up the timer
  useEffect(() => {
    let interval;
    if (timerActive) { // Only set up the timer if timerActive is true
      interval = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          const newTimeLeft = prevTimeLeft - 1;
          // console.log('time left:', newTimeLeft);
          if (newTimeLeft <= 0) {
            localStorage.removeItem('SHOPULSE_TIMER');
            localStorage.setItem('SHOPULSE_IS_TIMES_UP', 'true');
            clearInterval(interval); // Stop the interval when time is up
            setTimerActive(false); // Set the timerActive to false
            return 0;
          }
          localStorage.setItem('SHOPULSE_TIMER', newTimeLeft.toString());
          return newTimeLeft;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerActive]);


  // Call the toast when the time is up
  useEffect(() => {
    if (timeLeft === 0) {
      setIsTimesUp(true);
    }
  }, [timeLeft]);


  // Login function
  const login = async(userID) => {
    setUserID(userID);

    // save the user ID to the local storage
    const localStorage = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};

    if (!Object.keys(localStorage).includes('userID')) {
      localStorage.userID = userID;
      window.localStorage.setItem('SHOPULSE', JSON.stringify(localStorage));

      // start the tour
      setIsTourStart(true);
    }



    // Check the current path, if is chat, get the thread
    // if is gui, return
    const path =  location.pathname;
    if (path.includes('gui')) {
      console.log('GUI page, skipping thread');
      return;
    }


    try {
      setIsLoadingThread(true);

      let response;
      let threads;
      try {
        // check if the user has a thread
        response = await fetchData('/chat/threads?userId=' + userID);
        threads = response.threads;
        if (threads.length !== 0) {
          // sort the threads by updateAt
          threads.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          }, []);
          setThreadsList(threads);
          setCurrentThreadID(threads[0].threadId);
          // console.log(threads);
          return;
        }
      } catch (error) {
        // if the user is not found, just skip the error
        // the user will be created in the next step
        console.log('New user, creating a new thread');
      }

      // if the user doesn't have a thread, create a new thread
      let responseData = await postData('/chat/threads', { userId: userID });
      const threadID = responseData.threadId;
      setCurrentThreadID(threadID);
    } catch (error) {
      console.log(error);
      toast.error(error, {
        className: 'bg-white bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeButton: true,
      });
    }
  };

  // Logout function
  const logout = () => {
    setUserID('');
    setThreadsList({});
    setCurrentMessages({});
    setCurrentThreadID(null);
    // Clean up user data and tokens
  };

  useEffect(() => {
    // Gerneral state
    if (localStorage.getItem('SHOPULSE') !== null) {
      const userID = JSON.parse(localStorage.getItem('SHOPULSE')).userID;
      if (userID !== null) {
        login(userID);
        setIsLoginModalOpen(false);
      }
    }
  }, [location]);


  // CUI useEffect
  // When the current thread changes, connect to the EventSource
  // and retrieve the messages of the current thread
  useEffect(() => {
    if (!currentThreadID) {
      return;
    }

    // create a new EventSource
    const eventSource = new EventSource(baseURL + '/chat?threadId=' + currentThreadID);

    // eventSource listeners
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('EventSource received:', data);
      setCurrentEvent(data);

      if (data.type === 'messages' || data.type === 'confirmation') {
        setCurrentMessages(data);
      }

      if (data.type === 'runStatus'){
        setMessageStatus(data.data.status);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
      toast.error('Failed to connect to the server', {
        className: 'bg-white backdrop-blur-lg bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeButton: true,
      });
    }

    // terminating the connection on component unmount
    return () => eventSource.close();
  }, [currentThreadID]);


  // when the currentMessages changes, update the thread list too
  const updateThreadsList = async() => {
    const response = await fetchData('/chat/threads?userId=' + userID);

    const threads = response.threads;
    // sort the threads by updateAt
    threads.sort((a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }, []);
    setThreadsList(threads);
  };

  useEffect(() => {
    if (currentMessages && currentMessages.data) {
      updateThreadsList();
    }
  }, [currentMessages]);


  // GUI useEffect
  // When the productDataList changes, check if there is any result
  useEffect(() => {
    // console.log(productDataList);
    if (productDataList && productDataList.length > 0) {
      setHasResult(true);
    } else {
      setHasResult(false);
    }

    if (isLoadingData) {
      setHasResult(true);
    }

  }, [productDataList, isLoadingData]);




  return (
    <UserSessionContext.Provider value={{ 
      // General states
      userID,
      isLoginModalOpen,
      isInstructionModalOpen,
      isTimesUp,
      isTourStart,
      timerActive,
      timeLeft,
      setIsLoginModalOpen,
      setIsInstructionModalOpen,
      login, 
      logout,
      setIsTimesUp,
      setIsTourStart,
      setTimerActive,
      setTimeLeft,
      // CUI states
      currentThreadID,
      threadsList,
      isLoadingThread,
      currentEvent,
      currentMessages,
      messageStatus,
      userInput,
      setCurrentMessages,
      setCurrentThreadID,
      setIsLoadingThread,
      updateThreadsList,
      setUserInput,
      // GUI states
      productDataList,
      isLoadingData,
      hasResult,
      searchQuery,
      setProductDataList,
      setIsLoadingData,
      setHasResult,
      setSearchQuery,
      // useRef
      textAreaRef,
      sendMessageButtonRef,
      lastMessageRef,
      }}>
      {children}
    </UserSessionContext.Provider>
  );
};

// Custom hook to use auth context
export const useUserSession = () => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within UserSessionProvider');
  }
  return context;
}
