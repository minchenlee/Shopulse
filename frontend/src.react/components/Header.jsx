import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import Logo from '../svg/logo.jsx'
import Searchbar from './gui/Searchbar.jsx';
import Timer from './Timer.jsx';

function Header() {
  return (
  <div className='h-[78px] w-full z-30 ps-8 p-4 flex items-center justify-start bg-white sticky top-0 border-primary border-b-[1px]'>
    <div className='z-40 absolute right-4'>
      <Timer/>
    </div>
    <Link
      to='/gui'
      className='shadow-md rounded-full'>
      <Logo/>
    </Link>
    <Searchbar/>
    <ToastContainer/>
  </div>
  )
}

export default Header;
