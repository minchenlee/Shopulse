import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate, useLocation } from "react-router-dom";
import FeatherIcon from "feather-icons-react/build/FeatherIcon"
import { useUserSession } from "../../context/UserSessionContext";
import { fetchData } from "../../utils/api";

function Searchbar() {
  const navigate = useNavigate();
  const {searchQuery, setSearchQuery} = useUserSession();

  const handleSearch = () => {
    let queryString = '';
    if (searchQuery !== '') {
      queryString = `?keyword=${searchQuery}`;
    } else {
      return;
    }
    navigate('/gui' + queryString);
  }

  const handleKeyDown = (e) => {
    // Check if the pressed key is Enter
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className='step-one ms-8  w-1/3 max-w-[480px] font-nunito font-semibold relative'>
      <input 
      type='text'
      placeholder='Search' 
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      className='w-full peer bg-white border-[1px] border-primary rounded-2xl p-2 focus:outline-none focus:ring-2 focus:ring-silver transition-all duration-300 placeholder-primary placeholder:font-nunito placeholder:text-grey placeholder:font-bold'/>
      <button
      onClick={() => {
        handleSearch();
      }}
      className='absolute bottom-1 right-1 bg-secondary h-[34px] w-[34px] rounded-full flex justify-center items-center shadow-sm '>
        <FeatherIcon icon='search' className='text-primary px-[1px]' size='24px' strokeWidth='4px'/>
      </button>
    </div>
  );
}

export default Searchbar;
