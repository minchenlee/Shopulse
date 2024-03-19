import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from "react-router-dom";
import FeatherIcon from "feather-icons-react/build/FeatherIcon"
import toast from 'react-hot-toast';
import Logo from '../svg/logo.jsx'
import Searchbar from './gui/Searchbar.jsx';

function Header() {
  return (
  <div className='h-[78px] w-screen z-30 ps-8 p-4 flex items-center justify-start bg-white sticky top-0 border-primary border-b-[1px]'>
    <span className='shadow-md rounded-full'>
      <Logo/>
    </span>

    <Searchbar/>
  </div>
  )
}

export default Header;
