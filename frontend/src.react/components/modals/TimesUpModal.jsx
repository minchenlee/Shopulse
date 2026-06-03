import React, { useState, useEffect, memo } from 'react';
import { useUserSession } from '../../context/UserSessionContext';
import useClickOutside from '../../hooks/useClickOutside';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';


function TimesUpModal () {
  const { isTimesUp, setIsTimesUp } = useUserSession();
  // console.log(isTimesUp);

  useEffect(() => {
    const localIsTimesUp = localStorage.getItem('SHOPULSE_IS_TIMES_UP');
    if (localIsTimesUp) {
      setIsTimesUp(true);
    }

    // Disable scroll when the component mounts
    const body = document.body;
    body.style.overflow = isTimesUp ? 'hidden' : 'auto';

    // Re-enable scroll when the component unmounts
    return () => {
      body.style.overflow = 'auto';
    };
  }, [isTimesUp]);

  const removeTimesUp = () => {
    setIsTimesUp(false);
    localStorage.removeItem('SHOPULSE_IS_TIMES_UP');
  }

  const completionCode = 'w96j02u4ux87';

  const copyCompletionCode = () => {
    navigator.clipboard.writeText(completionCode);
    toast('Completion code copied!', {
      className: 'bg-secondary font-russoOne text-primary rounded-xl border-grey border-[1px] z-50',
      position: "top-center",
      autoClose: 1500,
      hideProgressBar: true,
      closeButton: false,
    });
  }

  return (
    <div className={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isTimesUp ? 'opacity-100' : 'opacity-0 invisible'}`}>
      <div className='w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80'>
        <div className='min-h-[324px] flex flex-col items-center justify-center w-full p-8'>
          <p className='text-primary text-3xl font-russoOne mb-2'>
            Time's up!
          </p>
          <p className='text-primary text-xl font-russoOne mb-2'>
            Please return to the Qualtrics survey.<br/>
          </p>
          <div className='flex flex-row items-center space-x-2'>
            <p className='text-primary text-xl font-russoOne'>
              Completion code: <span className='text-turkey-blue underline'>{completionCode}</span>
            </p>
            <button
              onClick={copyCompletionCode}
              className='bg-secondary text-primary border-primary border-[1px] w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-500
              active:bg-primary active:text-white active:scale-95'>
              <FeatherIcon icon='copy' size='16px' strokeWidth={3}/>
            </button>
          </div>
          {/* <button
            onClick={removeTimesUp}
            className='bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center absolute top-4 right-4'>
            <FeatherIcon icon='x' size='24px' strokeWidth={4}/>
          </button> */}
        </div>
      </div>
    </div>
  );
}

export default TimesUpModal;
