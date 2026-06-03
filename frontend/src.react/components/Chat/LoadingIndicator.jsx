import {dotPulse} from 'ldrs'
dotPulse.register()

export default function LoadingIndicator(){
  return(
    <div className='z-20 absolute inset-0 w-full h-full flex items-center justify-center bg-white text-primary'>
      <l-dot-pulse
        size="54"
        speed="1.3"
      ></l-dot-pulse>
    </div>
  )
}
