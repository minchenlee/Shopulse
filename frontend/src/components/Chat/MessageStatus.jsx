import { useState, useRef, useContext, useEffect } from 'react'
import FeatherIcon from 'feather-icons-react'
import 'ldrs/dotPulse'
import ProfileImage from './ProfileImage'

function MessageStatus(props){
  const name = props.name
  const role = props.role
  let status = props.status
  if (status === 'queued') {
    status = 'Thinking'
  }

  if (status === 'requires_action') {
    status = 'Searching'
  }

  if (status === 'in_progress') {
    status = 'Typing'
  }

  return (
    <div className='w-full mx-auto mb-6 md:max-w-3xl flex flex-row space-x-3 font-nunito text-base text-primary'>
      <ProfileImage role={role}/>
      <div className='flex flex-col w-11/12'>
        <div className='h-[28px] flex items-center font-extrabold text-base'>
          <span>{name}</span>
        </div>
        <div className='flex flex-row space-x-2 mt-2 mb-10 text-primary items-center'>
          <p className='text-base font-extrabold font-nunito'>{status}</p>
          <l-dot-pulse
            size="36"
            speed="1.4"
          ></l-dot-pulse>
        </div>
      </div>
    </div>
  )
}

export default MessageStatus
