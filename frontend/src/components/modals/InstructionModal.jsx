import React, { useState, useEffect, memo } from 'react';
import { useUserSession } from '../../context/UserSessionContext';
import useClickOutside from '../../hooks/useClickOutside';
import FeatherIcon from 'feather-icons-react';
import Markdown from 'react-markdown'
import textContent from '../../content_data/Welcome.json';
import { toast } from 'react-toastify';

export default function InstructionModal () {
  const {isInstructionModalOpen, setIsInstructionModalOpen} = useUserSession();
  const [index, setIndex] = useState(0);
  const [slowClose, setSlowClose] = useState(false);
  const [isAgree, setIsAgree] = useState(true);

  // get the path to check is at the gui page
  const path = window.location.pathname;
  let isGuiPage;
  if (path.includes('gui')) {
    isGuiPage = true;
  }

  // closing the modal
  const handleClosing = () => {
    if (isInstructionModalOpen) {
      setIsInstructionModalOpen(false);
      setTimeout(() => setSlowClose(false), 500);
    }
  }

  useEffect(() => {
    if (isInstructionModalOpen) {
      setSlowClose(true);
    }

    if (!isInstructionModalOpen) {
      setTimeout(() => {setSlowClose(false), setIndex(0)}, 500);
    }
  }, [isInstructionModalOpen]);


  const WelcomeList = isGuiPage ? textContent.GuiInstruction : textContent.ChatInstruction;
  const updateIndex = (num) => {
    if (index + num < 0) {
      const newIndex = WelcomeList.length - 1;
      setIndex(newIndex);
      return;
    }

    if (index + num >= WelcomeList.length) {
      handleClosing();
      return;
    }

    const newIndex = (index + num) % WelcomeList.length;
    setIndex(newIndex);
  }

  return (
    <div className={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isInstructionModalOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible': ''}`}>
      <div className='w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80 px-10 pt-8 pb-2'>
        <TitleBar title={WelcomeList[index].title} onClick={handleClosing}/>
        <Direction contentList={WelcomeList[index].content} image={WelcomeList[index].image} isAgree={isAgree} setIsAgree={setIsAgree}/>
        <div className='w-full flex flex-row items-center my-4'>
          <Button 
          title='' 
          isFor='left'
          onClick={() => updateIndex(-1)} 
          addClassName={`text-primary border-dark-grey border-[1px] ${index === 0 ? 'opacity-0' : ''}`}
          addAttr={index === 0 ? 'disabled' : ''}
          icon='chevron-left'
          />
          <div className='mx-auto'>
            <DotsIndicator length={WelcomeList.length} currentIndex={index}/>
          </div>
          <Button 
          title='' 
          isFor='right'
          onClick={() => updateIndex(1)} 
          addClassName='text-white bg-primary border-primary border-[1px]'
          // addAttr={'disabled'}
          icon='chevron-right'
         />
        </div>
      </div>
    </div>
  );
};


function TitleBar(props){
  const { title, onClick } = props;
  return(
    <div className='flex flex-row items-center justify-between mb-6'>
      <h2 className='text-2xl font-russoOne'>{title}</h2>
      <button className='' onClick={onClick}>
        <FeatherIcon icon='x' className='text-dark-grey px-[1px] hover:text-primary duration-300' size='32px' strokeWidth='3px'/>
      </button>
    </div>
  )
}


function Direction(props){
  const { image, contentList, isAgree, setIsAgree } = props;
  const agreeRef = React.useRef(null);

  const handleAgree = () => {
    setIsAgree(true);
  }

  // custom markdown component
  const customParagraphRenderer = {
    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2" {...props} />,
    p: ({node, ...props}) => <p className="text-lg" {...props} />,
    ol: ({node, ...props}) => <ol className="text-lg list-decimal list-outside ms-5 space-y-4" {...props} />,
    code: ({node, ...props}) => <code className="text-base font-normal p-1" {...props} />,
  };

  return(
    <div className='min-h-[244px] flex flex-row justify-between w-full h-full items-start'>
      { image && <img src={image} alt='image' className='w-[22rem] h-60'/> }
      <div className='font-nunito font-semibold text-primary mb-3 select-none'>
        <Markdown components={customParagraphRenderer}>
          {contentList}
        </Markdown>
        {contentList.includes('5.') && 
        <div className='flex flex-row items-center justify-end space-x-2 mt-16'>
          <div className='flex items-center justify-center relative'>
            <input 
              type='checkbox' 
              className='cursor-pointer z-20 w-6 h-6 appearance-none rounded-lg border-primary border-[1px] peer'
              ref={agreeRef}
              onChange={() => handleAgree()}
              checked={isAgree}
            />
            <FeatherIcon
              icon="check"
              size="20px"
              strokeWidth={6}
              className="z-10 text-primary hidden peer-checked:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <p className="cursor-pointer select-none"onClick={() => agreeRef.current.click()}>
            I agree to follow the instructions and do my best to complete the task
          </p>
        </div>
        }
      </div>
    </div>
  )
}


function Button(props){
  const { title, isFor, onClick, addClassName, addAttr, icon } = props;
  return(
    <button 
    onClick={onClick}
    disabled={addAttr}
    className={`flex flex-row items-center justify-center rounded-full w-24 h-10 py-1 mt-auto font-russoOne text-xl duration-500 ease-in-out hover:scale-105 hover:shadow-md ${addClassName}`}>
      {isFor === 'left' ? <FeatherIcon icon={icon} size='30px' strokeWidth={4}/> : ''}
      <span className=''>{title}</span>
      {isFor === 'right' ? <FeatherIcon icon={icon} size='30px' strokeWidth={4}/> : ''}
    </button>
  )
}


function DotsIndicator({ length, currentIndex }) {
  return (
    <div className="h-full flex flex-row justify-center items-center space-x-2">
      {Array.from({ length }, (_, idx) => (
        <div
          key={idx}
          className={`h-2 w-2 rounded-full ${currentIndex === idx ? 'bg-primary' : 'bg-grey'}`}
        ></div>
      ))}
    </div>
  );
}
