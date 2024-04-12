import React, { useState, useEffect, memo } from 'react';
import { useUserSession } from '../../context/UserSessionContext';
import useClickOutside from '../../hooks/useClickOutside';
import FeatherIcon from 'feather-icons-react';
import Markdown from 'react-markdown'
import textContent from '../../content_data/Welcome.json';
import { toast } from 'react-toastify';
import firstPic from '../../assets/undraw_experience_design_re_dmqq.svg'
import lastPic from '../../assets/undraw_secure_login_pdn4.svg'

// Modal Component
function LoginModal (props) {
  const { login } = useUserSession();
  const [index, setIndex] = useState(0);
  const [slowClose, setSlowClose] = useState(false);
  const { isOpen, onClose } = props;
  const [isAgree, setIsAgree] = useState(false);

  // get the path to check is at the gui page
  const path = window.location.pathname;
  const isGuiPage = path.includes('gui');

  // state for the user ID
  const [userID, setUserID] = useState('');

  // closing the modal
  const handleClosing = () => {
    if (isOpen) {
      onClose();
      setTimeout(() => setSlowClose(false), 500);
    }
  }

  // when user submit the user ID
  // check if the user ID is empty
  const handleRegister = () => {
    if (userID === '') {
      toast.warning('User ID cannot be empty', {
        className: 'bg-white bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: true,
        closeButton: false,
      })
      return;
    }

    login(userID);
    handleClosing();
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleRegister();
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSlowClose(true);
    }

    if (!isOpen) {
      setTimeout(() => setSlowClose(false), 500);
    }
  }, [isOpen]);

  const WelcomeList = isGuiPage ? textContent.GuiWelcome : textContent.ChatWelcome;
  const updateIndex = (num) => {
    if (index + num < 0) {
      const newIndex = WelcomeList.length - 1;
      setIndex(newIndex);
      return;
    }

    if (index + num >= WelcomeList.length) {
      handleRegister();
      return;
    }

    const newIndex = (index + num) % WelcomeList.length;
    setIndex(newIndex);
  }

  let image;
  if (index === 0) {
    image = firstPic;
  } else if (index === WelcomeList.length - 1) {
    image = lastPic;
  }

  return (
    <div className={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible': ''}`}>
      <div className='w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80 px-10 pt-8 pb-2'>
        <TitleBar title={WelcomeList[index].title}/>
        {index === WelcomeList.length - 1 
        ? 
        <RegisterForm userID={userID} setUserID={setUserID} handleKeyDown={handleKeyDown} image={image}/>
        :
        <Direction contentList={WelcomeList[index].content} image={image} isAgree={isAgree} setIsAgree={setIsAgree}/>
        }
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
  const { title } = props;
  return(
    <div className='flex flex-row items-center justify-between mb-6'>
      <h2 className='text-2xl font-russoOne'>{title}</h2>
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
    <div className='min-h-[244px] flex flex-row justify-between w-full h-full items-start select-none'>
      { image && <img src={image} alt='image' className='w-[22rem] h-60'/> }
      <div className='font-nunito font-semibold text-primary mb-3'>
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


function RegisterForm(props){
  const { userID, setUserID, handleKeyDown, image } = props;
  const handleChange = (event) => {
    setUserID(event.target.value);
  }

  return (
    <div className='min-h-[244px] flex flex-row  justify-between text-xl font-russoOne'>
      <img src={image} alt='image' className='w-[20rem] h-60'/>
      <div className='h-auto me-10 flex flex-col space-y-4'>
        <p className='text-primary px-4'>Please enter your Prolific ID</p>
        <input 
        type='text' 
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        value={userID}
        placeholder='Prolific ID' 
        className='w-auto h-12 bg-transparent focus:outline-none focus:ring-2 focus:ring-grey transition-all duration-300 focus:rounded-2xl border-b-2 border-grey px-4 text-lg'
        />
      </div>
    </div>
  )
}


export default LoginModal;
