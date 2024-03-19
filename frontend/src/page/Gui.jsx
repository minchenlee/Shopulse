import { useState, useRef, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import {dotPulse} from 'ldrs'
dotPulse.register()

import GuiContent from '../content_data/GUI.json'
// console.log(FilteringOptionList)

function GUIPage() {
  const category = GuiContent.mainPage.Category;
  const brandList = GuiContent.mainPage.Category.Brand;
  const screenTypeList = GuiContent.mainPage.Category.ScreenType;
  return (
    <div className='min-h-[calc(100vh-78px)] min-w-screen'>
      <FilteriingSidebar/>
      <div className='ms-[234px] ps-[22px] pt-6 space-y-16'>
        <CategoryList title='By brand' type='brand' categoryList={brandList}/>
        <CategoryList title='By screen type' type='screentype' categoryList={screenTypeList}/>
      </div>
    </div>
  )
}

function CategoryList(props) {
  const title = props.title;
  const categoryList = props.categoryList;
  const type = props.type;

  return (
    <div className='flex flex-col'>
      <h2 className='text-primary font-russoOne text-xl mb-4'>{title}</h2>
      <div className='flex flex-row items-center pe-40 overflow-scroll no-scrollbar'>
        {categoryList.map((category) => {
          return <CategoryCard 
          name={category.name} 
          value={category.value} 
          type={type}
          img={category.img} 
          key={category.value}
          scale={category.scale}
          />
        })}
      </div>
      <div className='invisible scale-[2]'></div>
      <div className='invisible scale-[1.7]'></div>
      <div className='invisible scale-[0.5]'></div>
    </div>
  )
}


function CategoryCard(props) {
  const name = props.name;
  const value = props.value;
  const img = props.img;
  const type = props.type;
  const scale = props.scale;

  if (type === 'screentype') {
    return (
    <div className='min-w-[335px] min-h-48 flex items-center justify-center me-6 rounded-xl relative overflow-hidden'>
      <div className='z-10 w-full min-h-48 flex items-center justify-center bg-primary bg-opacity-40 backdrop-blur-[2px]'>
        <p className='text-base text-white font-russoOne'>{name}</p>
      </div>
      <img src={img} alt={name} className='w-full object-contain absolute z-0'/>
    </div>
    )
  }

  return (
    <div className='min-w-[335px] w-[335px] min-h-24 border-2 border-grey flex items-center justify-center me-6 rounded-xl overflow-hidden'>
      {/* <p className='text-2xl text-primary font-russoOne z-10'>{name}</p> */}
      <img src={img} alt={name} className={`w-full h-24 object-contain scale-[${scale}]`}/>
    </div>
  )
}




function FilteriingSidebar() {
  const FilteringOptionList = GuiContent.mainPage.FilteringOptionList;

  return (
    <div className='pt-4 ps-8 fixed h-screen w-[234px] border-e-[1px] border-primary overflow-scroll no-scrollbar pb-24'>
      { FilteringOptionList.map((optionObject, index) => {
        return (
          <FilteringSubset 
          key={index}
          title={optionObject.title}
          optionList={optionObject.options}
          type={optionObject.type}
          />
        )
      })}
    </div>
  )
}


function FilteringSubset(props) {
  const title = props.title;
  const optionList = props.optionList;
  const type = props.type;
  
  return (
    <div className='flex flex-col text-base mb-4'>
      <h2 className='text-primary font-russoOne mb-1'>{title}</h2>
      <div className='flex flex-col font-nunito'>
        {optionList.map((option, index) => {
          // Handle single option, like the price range and the screen size range
          // These option can only have one value, their value is also an object, 
          let optionKey = false;
          if (type === 'single') {
            // Get the option's key and value
            optionKey = Object.keys(option.value)[1]
            option.value = option.value[optionKey]
          }

          return (
            <div
            key={index}
            className='flex items-center w-auto mb-[2px]'>
              <input 
              id={option.value}
              type='checkbox' 
              className='cursor-pointer appearance-none w-[14px] h-[14px] rounded-sm checked:bg-primary border-primary border-[1px] duration-150'/>
              <label htmlFor={option.value}
              className='cursor-pointer ms-2 text-primary font-nunito w-auto min-w-20 hover:font-bold duration-150'>
                {option.name}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default GUIPage;
