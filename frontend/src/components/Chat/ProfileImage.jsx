function ProfileImage({role}){
  if (role === 'assistant') {
    return <span className='bg-turkey-blue  h-[28px] w-[28px] rounded-full'/>
  } else {
    return <span className='bg-secondary h-[28px] w-[28px] rounded-full'/>
  }
}

export default ProfileImage
