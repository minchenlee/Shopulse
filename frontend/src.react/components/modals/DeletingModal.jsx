import React, { useState, useEffect } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import FeatherIcon from 'feather-icons-react';
import textContent from '../../content_data/Chat.json';

// Modal Component
function Modal (props) {
  const [index, setIndex] = useState(0);
  const [slowClose, setSlowClose] = useState(false);
  const { isOpen, onClose } = props;

  // Use the useClickOutside hook to handle clicks outside the modal
  const modalRef = useClickOutside(() => {
    if (isOpen) {
      onClose(); // Close the modal if it's open and an outside click is detected
      setTimeout(() => setSlowClose(false), 500);
    }
  });

  useEffect(() => {
    if (isOpen) {
      setSlowClose(true);
    }

    if (!isOpen) {
      setTimeout(() => setSlowClose(false), 500);
    }
  }, [isOpen]);

  // extract the key value pairs from the textContent object from Chat.json
  const TitleList = Object.keys(textContent.howToAsk);
  const contentList = Object.values(textContent.howToAsk);
  const updateIndex = (num) => {
    // if the index is less than 0, set the index to the last index of the TitleList
    if (index + num < 0) {
      const newIndex = TitleList.length - 1;
      setIndex(newIndex);
      return;
    }
    const newIndex = (index + num) % TitleList.length;
    setIndex(newIndex);
  }

  return (
    <div className={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible': ''}`}>
      <div ref={modalRef} className='w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-50'>
        <TitleBar title='How to ask?' onClick={onClose}/>
        <div className='min-h-[324px] flex flex-row w-full'>
          <div className='w-9/12 bg-white px-6 pt-6 pb-4 rounded-3xl'>
            <Direction 
            title={TitleList[index]} 
            contentList={contentList[index]} 
            onClick={() => updateIndex(-1)}
            />
          </div>
          <div className='w-4/12 bg-primary rounded-3xl'>
            <NextButton
            title={TitleList[(index + 1) % TitleList.length]}
            onClick={() => updateIndex(1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};


function TitleBar(props){
  const { title, onClick } = props;
  return(
    <div className='flex flex-row items-center justify-between px-5 py-4'>
      <h2 className='text-2xl font-russoOne'>{title}</h2>
      <button className='' onClick={onClick}>
        <FeatherIcon icon='x' className='text-dark-grey px-[1px] hover:text-primary duration-300' size='32px' strokeWidth='3px'/>
      </button>
    </div>
  )
}

export default Modal;
