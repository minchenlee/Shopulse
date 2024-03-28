import React, { createContext, useContext, useEffect, useState } from 'react';
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

  // General functions
  // Login function
  const login = async(userID) => {
    setUserID(userID);

    // save the user ID to the local storage
    const localStorageData = {
      userID: userID,
    };
    localStorage.setItem('SHOPULSE', JSON.stringify(localStorageData));

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
      login, 
      logout,
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
