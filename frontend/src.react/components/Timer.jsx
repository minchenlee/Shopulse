import { useState, useEffect, useContext } from 'react';
import { useUserSession } from '../context/UserSessionContext';
import {ToastContainer, toast} from 'react-toastify';
import FeatherIcon from 'feather-icons-react';

function Timer() {
  // The reason not to elevate the state to the UserSessionContext
  // is because the Timer need to be updated every second
  // if the state is elevated, the whole Page will be re-rendered every second
  // which results in the lagging of the page
  const {isTimesUp, setIsTimesUp, isTourStart, setIsTourStart, timerActive, setTimerActive, timeLeft, setTimeLeft, setIsInstructionModalOpen} = useUserSession();
  const startTimer = () => {
    // Check if the timer is already active
    if (timerActive) {
      return;
    }
    setTimerActive(true); // Function to start the timer
    localStorage.removeItem('SHOPULSE_IS_TIMES_UP');
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleStartTour = () => {
    // console.log('Tour start');
    setIsTourStart(true);
  }

  const handleInstructionModal = () => {
    setIsInstructionModalOpen(true);
  }


  return (
    <div className='flex flex-row items-center space-x-3'>
      <button 
      className='step-five w-8 h-8 flex items-center justify-center bg-white rounded-full border-primary border-[1px] opacity-30 hover:opacity-100 duration-500 font-russoOne relative group'
      onClick={handleInstructionModal}
      >
        {/* <FeatherIcon icon='info' size='20px' strokeWidth={3}/> */}
        <span>i</span>
      </button>
      <button
      onClick={handleStartTour}
      className='step-six w-8 h-8 flex items-center justify-center bg-white rounded-full border-primary border-[1px] opacity-30 hover:opacity-100 duration-500 font-russoOne relative group'>
        <span>?</span>
        {/* <span className='absolute duration-500 opacity-0 bottom-0 right-1/2 translate-x-1/2 bg-primary text-white w-4 h-4 rounded-full flex items-center justify-center group-hover:opacity-100'>i</span> */}
      </button>
      <button 
      onClick={startTimer}
      className='step-seven w-48 h-auto flex items-center justify-center p-2 bg-white rounded-xl border-primary border-[1px] opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-default'>
        <div className='flex flex-row items-center font-russoOne'>
          <div className='me-2'>Time left:</div>
          {/* <div className={`${timerActive ? 'animate-breathe-scale' : ''}`}> */}
          <div>
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </div>
        </div>
      </button>
    </div>
  );
}

export default Timer;