import { useState, useRef, useContext, useEffect, memo } from 'react'
import isEqual from 'react-fast-compare';
import FeatherIcon from 'feather-icons-react'
import { useCursorInside } from '../../hooks/useCursorInside'
import { useUserSession } from '../../context/UserSessionContext';
import { StarRow } from '../gui/Star';
import { Image } from '../Chat/Carousel';

import BufferJSON from '../../dummy_data/buffer.json';
import ChatShortCutJSON from '../../content_data/ChatShortCui.json';

// The buffer will display the product list
function Buffer(props) {
  let productList = props.productList;
  if (productList.length === 0) {
    productList = BufferJSON.productList;
  }
  // remove the repeated products, keep the last one
  productList = productList.filter((product, index, self) =>
    index === self.findIndex((t) => (
      t.id === product.id
    ))
  );

  const isDemoMode = productList[0].id === 'demo';
  const productListLength = productList.length;
  const isBufferShown = props.isBufferShown;
  const filteringCondition = props.filteringCondition || BufferJSON.filteringCondition;

  // The last third of the buffer will be used to scroll to the last third of the buffer
  const lastThirdProductRef = useRef(null);

  // Read the deleted status from the local storage
  // If the product is marked as deleted, it will not be shown in the buffer
  const localStorage = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
  const [deletedProductDict, setdeletedProductDict] = useState(localStorage.deletedProductDict || {});

  // When the buffer is shown, scroll to the last third of the buffer
  // Consider to change to when the buffer is shown and the product list is updated
  useEffect(() => {
    // console.log(productList);
    // if the productList is different from the previous one, scroll to the last third
    if (isBufferShown) {
      const lastThird = lastThirdProductRef.current;

      if (lastThird) {
        setTimeout(() => {
          lastThird.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 500);
      }
    }
  }, [productList]);

  // When user delete the product, the product will be marked as deleted and will not be shown in the buffer
  // This status will be stored in the local storage
  // The product's name is used as the unique identifier
  useEffect(() => {
    if (Object.keys(deletedProductDict).length > 0) {
      localStorage.deletedProductDict = deletedProductDict;
      window.localStorage.setItem('SHOPULSE', JSON.stringify(localStorage));
    }
  }, [deletedProductDict]);

  if (isDemoMode) {
    return(
      <div
      id='buffer'
      className='flex flex-col w-full h-full items-center overflow-y-scroll overflow-x-hidden space-y-4 2xl:px-12 px-4 pb-20 relative'>
        <FilterDisplay filteringCondition={filteringCondition} isBufferShown={isBufferShown}/>
        {productList.map((product, index) => {
          return <DemoProductCard key={index} product={product}/>
        })}
      </div>
    )
  }

  return(
    <div
    id='buffer'
    className='flex flex-col w-full h-full items-center overflow-y-scroll overflow-x-hidden space-y-4 2xl:px-12 px-4 pb-20 relative'>
      <FilterDisplay filteringCondition={filteringCondition} isBufferShown={isBufferShown}/>
      {productList.map((product, index) => {
        return <ProductCard 
        key={index} 
        index={index} 
        product={product} 
        lastThirdProductRef={lastThirdProductRef}
        isBufferShown={isBufferShown} 
        productListLength={productListLength} 
        deletedProductDict={deletedProductDict}
        setdeletedProductDict={setdeletedProductDict}
        />
      })}
    </div>
  )
}


function FilterDisplay(props){
  const { userInput, setUserInput } = useUserSession();
  const isBufferShown = props.isBufferShown;
  const filteringCondition = props.filteringCondition;
  const filterKeyList = filteringCondition ? Object.keys(filteringCondition) : [];
  const filterList = filterKeyList ? filterKeyList.map((key) => {
    return `${key}: ${filteringCondition[key]}`;
  }) : [];

  if (filterList.length < 1) {
    return;
  }

  const handleClearAll = () => {
    setUserInput('Forget all previous filters, I want to start over.');
  }

  const filterOpacity = isBufferShown ? 'opacity-100' : 'opacity-0';

  return(
    <div className={`step-nine bg-white flex flex-col border-[1px] border-primary rounded-lg px-4 py-2 w-full duration-1000 ${filterOpacity}`}>
      <div className='flex flex-row items-center justify-between mb-2'>
        <span className='text-xl font-extrabold text-primary'>Filter</span>
        <button 
        onClick={handleClearAll}
        className='text-lg text-dark-grey font-bold underline decoration-solid hover:text-primary duration-300'>
          clear all
        </button>
      </div>
      <div className='flex flex-row flex-wrap items-start justify-start'>
        {filterList.map((filter, index) => {
          return (
            <span
            key={index}
            className='px-4 py-1 bg-secondary text-primary font-extrabold text-sm rounded-full me-1 mb-2'>
              {filter}
            </span>
          )
        })}
      </div>
    </div>
  )

}

function ProductCard(props){
  const { currentThreadID, setUserInput, sendMessageButtonRef } = useUserSession();
  const [ shouldClick, setShouldClick] = useState(false);
  const { deletedProductDict, setdeletedProductDict } = props;

  // the delete confirmation tooltip
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const index = props.index;
  const product = props.product;
  const isBufferShown = props.isBufferShown;
  const deleteProductListLength = deletedProductDict[currentThreadID] ? deletedProductDict[currentThreadID].length : 0;
  const productListLength = props.productListLength - deleteProductListLength;
  const cardOpacity = isBufferShown ? 'opacity-100' : 'opacity-0';
  const lastThirdProductRef = (productListLength - index === 3) ? props.lastThirdProductRef : null;

  // When the product is marked as deleted, it will not be shown in the buffer
  const threadIdList = Object.keys(deletedProductDict);
  let deletedProductList = threadIdList.includes(currentThreadID) ? deletedProductDict[currentThreadID] : [];
  const isDeleted = deletedProductList.includes(product.name);

  // When the shouldClick flag is true, click the submit button
  useEffect(() => {
    // Only click the button if shouldClick is true
    if (shouldClick && sendMessageButtonRef.current) {
      sendMessageButtonRef.current.click();
      setShouldClick(false); // Reset the flag after clicking
    }
  }, [shouldClick]);

  const handleShortCutClick = (productName, shortCut) => {
    if (productName.length > 45) {
      productName = productName.slice(0, 45) + '...';
    }

    const productId = product.id;
    const newQuery = shortCut.replace(/<product>/g, `${productName} <productId>${productId}<productId>`);
    setUserInput(newQuery);
    setShouldClick(true); // Set the flag to true to trigger the click
  }

  // Logic to handle the delete
  // Using the product name as the unique identifier
  const handleDelete = () => {
    deletedProductList.push(product.name);
    setdeletedProductDict({...deletedProductDict, [currentThreadID]: deletedProductList});
  }

  if (isDeleted) return;
  
  return(
    <div 
    ref={lastThirdProductRef ? lastThirdProductRef : null}
    className={`scroll-mt-3 flex flex-col rounded-xl border-[1px] border-grey ${cardOpacity} w-full min-w-56 transition-opacity duration-1000 mb-2 font-nunito shadow-md relative group`}>
      <button
      onClick={() => setIsConfirmOpen(!isConfirmOpen)}
      className='w-10 h-10 flex items-center justify-center absolute z-20 top-4 right-4 opacity-0 bg-secondary rounded-full p-1 group-hover:opacity-100 hover:scale-110 hover:shadow-md transition-all duration-300 border-primary border-2'>
        <FeatherIcon icon='trash-2' size='24px' strokeWidth={2}/>
        <ConfirmToolTip isConfirmOpen={isConfirmOpen} setIsConfirmOpen={setIsConfirmOpen} handleDelete={handleDelete}/>
      </button>
      <img src={product.image} alt={product.name} className='w-full px-2 pt-4 object-contain'/>
      <div className='flex flex-col px-6 mt-4 pb-4'>
        <span className='text-base font-semibold truncate ...'>{product.name}</span>
        <div className='flex flex-row flex-wrap items-center justify-between mb-2'>
          <span className='text-lg font-extrabold text-primary'>${product.price}</span>
          <div className='flex flex-row items-center text-base space-x-2'>
            <span className='font-semibold text-primary'>{product.rating}</span>
            <StarRow rating={product.rating}/>
            <span className='font-semibold text-primary'>{product.reviewCount}</span>
          </div>
        </div>
        <div className='flex flex-row items-center justify-evenly text-lg font-bold'>
          <button
          onClick={() => handleShortCutClick(product.name, ChatShortCutJSON.Details)}
          className='w-full py-1 border-[1px] bg-white border-grey rounded-l-full hover:shadow-sm hover:bg-light-silver transition-all duration-300'>
            Details
          </button>
          <button
          onClick={() => handleShortCutClick(product.name, ChatShortCutJSON.Reviews)}
          className='w-full py-1 border-[1px] bg-white border-grey rounded-r-full hover:shadow-sm hover:bg-light-silver transition-all duration-300'>
            Reviews
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmToolTip(props){
  const handleDelete = props.handleDelete;
  const isConfirmOpen = props.isConfirmOpen;
  const setIsConfirmOpen = props.setIsConfirmOpen;
  const { isCursorInside, handleMouseEnter, handleMouseLeave } = useCursorInside();
  
  useEffect(() => {
    if (isCursorInside) {
      setIsConfirmOpen(true);
    } else {
      setIsConfirmOpen(false);
    }
  }, [isCursorInside]);


  return(
    <div 
    className={`text-sm font-russoOne px-1 py-2 break-keep top-1/2 -right-1 -translate-y-1/2 absolute bg-secondary border-primary border-[1px] rounded-full transition-opacity duration-500 ${isConfirmOpen ? 'opacity-100 w-40' : 'invisible opacity-0 w-0'}`}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onClick={() => handleDelete()}
    >
      Click again to delete
    </div>
  )
}


function DemoProductCard(props){
  const { product } = props;
  return(
    <div className='step-ten flex flex-col rounded-xl border-[1px] border-grey w-full min-w-56 lg:min-w-[350px] mb-2 font-nunito shadow-md overflow-hidden'>
      <div className='w-full h-[250px] bg-light-silver flex items-center justify-center px-4'>
        <span className='text-lg font-russoOne text-primary'>
          {BufferJSON.demoCardContent}
        </span>
      </div>
      <div className='flex flex-col px-6 pb-4'>
        <span className='text-base font-semibold truncate ...'>{product.name}</span>
        <div className='flex flex-row items-center justify-between mb-2'>
          <span className='text-lg font-extrabold text-primary'>${product.price}</span>
          <div className='flex flex-row items-center text-base space-x-2'>
            <span className='font-semibold text-primary'>{product.rating}</span>
            <StarRow rating={product.rating}/>
            <span className='font-semibold text-primary'>{product.reviewCount}</span>
          </div>
        </div>
        <div className='flex flex-row items-center justify-evenly text-lg font-bold'>
          <button
          className='w-full py-1 border-[1px] bg-white border-grey rounded-l-full hover:shadow-sm hover:bg-light-silver transition-all duration-300'>
            Details
          </button>
          <button
          className='w-full py-1 border-[1px] bg-white border-grey rounded-r-full hover:shadow-sm hover:bg-light-silver transition-all duration-300'>
            Reviews
          </button>
        </div>
      </div>
    </div>
  )
}


export default memo(Buffer, isEqual);

