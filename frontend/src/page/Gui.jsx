import { useState, useRef, useContext, useEffect, useMemo, memo } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react'
import { ToastContainer, toast } from 'react-toastify';
import Joyride from 'react-joyride';
import {dotPulse} from 'ldrs'
dotPulse.register()

import ProductCard from '../components/gui/ProductCard';
import LoginModal from '../components/modals/LoginModal';
import TimesUpModal from '../components/modals/TimesUpModal';
import InstructionModal from '../components/modals/InstructionModal';

import GuiContent from '../content_data/GUI.json'
import DummyData from '../dummy_data/filterProduct.json'
import { useUserSession } from '../context/UserSessionContext';
import { fetchData } from '../utils/api';
// console.log(FilteringOptionList)
import ledImage from '../assets/screen_type/led-lcd.png'
import oledImage from '../assets/screen_type/oled.png'
import qledImage from '../assets/screen_type/qled.png'

import samsungImage from '../assets/brand_logo/samsung-logo.svg'
import sonyImage from '../assets/brand_logo/sony-logo.svg'
import lgImage from '../assets/brand_logo/lg-logo.svg'
import tclImage from '../assets/brand_logo/tcl-logo.svg'
import hisenseImage from '../assets/brand_logo/hisense-logo.svg'

const imageDict = {
  'led-lcd': ledImage,
  'oled': oledImage,
  'qled': qledImage,
  'samsung': samsungImage,
  'sony': sonyImage,
  'lg': lgImage,
  'tcl': tclImage,
  'hisense': hisenseImage,
}


function GUIPage() {
  const { productDataList, setProductDataList, isLoadingData, setIsLoadingData, hasResult, setHasResult, setSearchQuery, isLoginModalOpen, setIsLoginModalOpen, isTourStart, setIsTourStart, timerActive, setTimerActive, isInstructionModalOpen, setIsInstructionModalOpen} = useUserSession();
  const location = useLocation();
  const category = GuiContent.mainPage.Category;
  const brandList = GuiContent.mainPage.Category.Brand;
  const screenTypeList = GuiContent.mainPage.Category.ScreenType;
  const [hasNoFilter, setHasNoFilter] = useState(true);

  const getProductDataList = async (queryString) => {
    let data;
    setIsLoadingData(true);

    // if the query string contains keyword, search for the keyword
    if (queryString.includes('keyword=')) {
      data = await fetchData('/products/search' + queryString);
    } else {
      data = await fetchData('/products/filter' + queryString);
    }

    setProductDataList(data);
    // back to the top of the page
    setTimeout(() => {
      window.scrollTo(0, 0);
      setIsLoadingData(false);
    }, 300);
  }

  useEffect(() => {
    const localStorage = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
    const userID = localStorage.userID;

    // When the query string changes, fetch the product data list
    let queryString = location.search;
    if (queryString !== '') {
      queryString += '&limit=16&fullDetails=false&userId=' + userID;
      setHasNoFilter(false);
    } else {
      queryString = '?limit=16&fullDetails=false&userId=' + userID;
      setSearchQuery('');
      setTimeout(() => {
        setHasNoFilter(true);
      }, 300);
    }

    getProductDataList(queryString);
  }, [location]);


  // Reset the tour when the joyride is completed
  const handleReset = (data) => {
    // console.log(data);
    if (data.action === 'reset') {
      setIsTourStart(false);
    }
    
    if (data.action === 'stop') {
      if (!timerActive) {
        setTimerActive(true);
      }
    }
  }


  return (
    <div className='min-h-[calc(100vh-78px)] min-w-screen relative'>
      <FilteriingSidebar 
      setProductDataList={setProductDataList}
      setIsLoadingData={setIsLoadingData}
      className='step-two'
      />
      {hasResult ? 
        <div className='ms-[234px] ps-8 pt-4 space-y-16 pb-12'>
          { hasNoFilter ?
            <>
              <CategoryList title='By brand' type='brand' categoryList={brandList}/>
              <CategoryList title='By screen type' type='screentype' categoryList={screenTypeList}/>
              <SortProductList query='&minPrice=600' title='Popular'/>
              <SortProductList query='&sortBy=rating&maxPrice=650' title='On Budget'/>
            </>
            :
            <>
            {isLoadingData ? 
            <LoadingIndicator/> 
            :
            <ResultList/>
            }
            </>
          }
        </div>
      :
        <NoResult/>
      }
      <ToastContainer/>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <InstructionModal/>
      <TimesUpModal/>
      <Joyride 
        steps={steps}
        run={isTourStart}
        continuous={true}
        hideCloseButton={true}
        disableCloseOnEsc={true}
        disableOverlayClose={true}
        callback={handleReset}
        spotlightPadding={4}
        styles={{
          options: {
            primaryColor: '#343434',
            textColor: '#343434',
            zIndex: 1000,
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            borderRadius: 15,
            fontFamily: 'Nunito',
            fontSize: '1rem',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '10px 10px',
          },
          tooltipFooter: {
            marginTop: 0,
          },
          buttonNext: {
            borderRadius: 10,
            padding: '10px 20px',
            margin: '0 0 0 10px',
          },
        }}
      />
    </div>
  )
}


const CategoryList = memo(function CategoryList(props) {
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
          img={imageDict[category.img]}
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
});


function CategoryCard(props) {
  const name = props.name;
  const value = props.value;
  const img = props.img;
  const type = props.type;
  const scale = props.scale;
  const parameterKey = normalzedTitle(type);

  if (type === 'screentype') {
    return (
    <Link
    to={`/gui?screenType=${value}`}
    className='min-w-[335px] min-h-48 flex items-center justify-center me-6 rounded-xl relative overflow-hidden'>
      <div className='z-10 w-full min-h-48 flex items-center justify-center bg-primary bg-opacity-40 backdrop-blur-[2px]'>
        <p className='text-base text-white font-russoOne'>{name}</p>
      </div>
      <img src={img} alt={name} className='w-full object-contain absolute z-0'/>
    </Link>
    )
  }

  return (
    <Link 
    to={`/gui?brand=${value}`}
    className='min-w-[335px] w-[335px] min-h-24 border-2 border-grey flex items-center justify-center me-6 rounded-xl overflow-hidden'
    >
      {/* <p className='text-2xl text-primary font-russoOne z-10'>{name}</p> */}
      <img src={img} alt={name} className={`w-full h-24 object-contain scale-[${scale}]`}/>
    </Link>
  )
}


const SortProductList = memo(function SortProductList(props) {
  const title = props.title;
  const query = props.query

  const [productDataList, setProductDataList] = useState([]);
  const getProductDataList = async () => {
    const productDataList = await fetchData(`/products/filter?limit=4&fullDetails=false${query}`);
    setProductDataList(productDataList);
  }


  useEffect(() => {
    getProductDataList();
  }, []);

  if (productDataList.length === 0) {
    return;
  }

  return (
    <div className='flex flex-col items-start'>
      <h2 className='w-full text-primary font-russoOne text-xl'>{title}</h2>
      <div className='flex flex-row items-center justify-center space-x-4 w-full 2xl:w-2/3'>
        {productDataList.map((product) => {
          return <ProductCard
          key={product._id}
          productId={product._id}
          productImageList={product.productImageList}
          productName={product.productName}
          productPrice={product.productPrice}
          productRating={product.productRating}
          productReviewCount={product.productReviewCount}
          />
        })}
      </div>
    </div>
  )
});


function ResultList() {
  const { productDataList, setProductDataList, isLoadingData, setIsLoadingData } = useUserSession();
  return(
    <div className='flex flex-col items-center'>
      <h2 className='w-full text-primary font-russoOne text-xl mb-4'>Results</h2>
      <div className=' grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-12'>
        {productDataList.map((product) => {
          return <ProductCard
          key={product._id}
          productId={product._id}
          productImageList={product.productImageList}
          productName={product.productName}
          productPrice={product.productPrice}
          productRating={product.productRating}
          productReviewCount={product.productReviewCount}
          />
        })}
      </div>
      <PageSelector 
      productDataList={productDataList} 
      setProductDataList={setProductDataList}
      setIsLoadingData={setIsLoadingData}
      />
    </div>
  )
}

function PageSelector(props) {
  const navigate = useNavigate();
  const { productDataList } = props;
  let queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const pagination = parseInt(urlParams.get('pagination')) || 0;
  const [currentPage, setCurrentPage] = useState(pagination);
  const [isNextPageHasProduct, setIsNextPageHasProduct] = useState(false);

  const handleNextPage = async() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    queryString = queryString.replace(/[?&]pagination=\d+&?/g, '');
    if (queryString === '') {
      queryString = `?pagination=${nextPage}`;
    } else {
      queryString += `&pagination=${nextPage}`;
    }
    navigate(queryString);
  };

  const handlePrevPage = () => {
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    queryString = queryString.replace(/[?&]pagination=\d+&?/g, '');
    if (queryString === '') {
      queryString = `?pagination=${prevPage}`;
    } else {
      queryString += `&pagination=${prevPage}`;
    }

    if (prevPage === 0) {
      queryString = queryString.replace(/[?&]pagination=\d+&?/g, '');
    }
    navigate(queryString);
  };

  // Check if there is a next page
  const hasNextPage = async () => {
    let nextPageData;
    const nextPage = currentPage + 1;
    let nextQueryString = queryString.replace(/pagination=\d+&?/g, '');

  
    if (nextQueryString === '') {
      nextQueryString = `?pagination=${nextPage}`;
    } else {
      nextQueryString += `&pagination=${nextPage}`;
    }
  
    if (queryString.includes('keyword=')) {
      nextPageData = await fetchData('/products/search' + nextQueryString + '&limit=16&fullDetails=false');
    } else {
      nextPageData = await fetchData('/products/filter' + nextQueryString + '&limit=16&fullDetails=false');
    }

    return nextPageData.length > 0;
  };

  useEffect(() => {
    hasNextPage().then((result) => {
      setIsNextPageHasProduct(result);
    });
  }, [currentPage]);
  

  return(
    <div className='pe-8 mt-12 flex flex-row items-center justify-center text-xl space-x-4'>
      <button 
      className='w-8 h-8 bg-secondary rounded-full flex items-center justify-center disabled:opacity-30'
      disabled={currentPage === 0}
      onClick={handlePrevPage}
      >
        <FeatherIcon icon='chevron-left' className='text-primary' size="24px" strokeWidth={4}/>
      </button>
      <p className='text-lg text-center w-10 leading-none text-primary font-russoOne'>{currentPage + 1}</p>
      <button 
      className='w-8 h-8 bg-secondary rounded-full flex items-center justify-center disabled:opacity-30'
      disabled={productDataList.length < 16 || !isNextPageHasProduct}
      onClick={handleNextPage}
      >
        <FeatherIcon icon='chevron-right' className='text-primary' size="24px" strokeWidth={4}/>
      </button>
    </div>
  )
}


function NoResult() {
  return (
    <div className='ms-[234px] flex flex-col justify-center items-center min-h-[calc(100vh-78px)]'>
      <h1 className='mb-4 w-full text-center text-primary font-russoOne text-2xl'>
        No Results... <br/>
        Try a different filter
      </h1>
      {/* guild user back to previous page */}
      <button
      onClick={() => window.history.back()}
      className='mb-24 bg-secondary border-primary border-[1px] rounded-full px-8 py-2 text-primary font-russoOne text-xl hover:scale-105 hover:shadow-sm duration-300'>
        Back
      </button>
      <div className=''>
        <img 
        src='/src/assets/undraw_taken_re_yn20.svg' 
        alt='No result' 
        className='object-fit max-w-[600px] max-h-[400px]'
        />
      </div>
    </div>
  )
}


function LoadingIndicator(){
  return(
    <div className='z-20 w-full min-h-[calc(100vh-78px)] flex items-center justify-center bg-white text-primary'>
      <l-dot-pulse
        size="54"
        speed="1.3"
      ></l-dot-pulse>
    </div>
  )
}


const FilteriingSidebar = memo(function FilteriingSidebar(props) {
  const className = props.className;
  const FilteringOptionList = GuiContent.mainPage.FilteringOptionList;
  const navigate = useNavigate();
  const resetFilter = () => {
    const newUrl = window.location.pathname;
    navigate(newUrl, { replace: true });
  }

  return(
    <div className={`${className} pt-4 ps-8 fixed h-screen w-[234px] border-e-[1px] border-primary overflow-scroll no-scrollbar pb-24`}>
      <div className='flex flex-row items-center mb-4'>
        <h1 className='text-primary font-russoOne text-xl'>Filter</h1>
        <button
        onClick={resetFilter}
        className='bg-secondary border-primary border-[1px] rounded-full px-4 text-primary font-russoOne text-base ms-auto me-4 hover:scale-105 hover:shadow-sm duration-300'>
          Reset
        </button>
      </div>
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
});


function FilteringSubset(props) {
  const title = props.title;
  const optionList = props.optionList;
  const type = props.type;
  const parameterKey = normalzedTitle(title);
  const urlParams = new URLSearchParams(window.location.search);

  return (
    <div className='flex flex-col text-base mb-4'>
      <h2 className='text-primary font-russoOne mb-1'>{title}</h2>
      <div className='flex flex-col font-nunito'>
        {optionList.map((option, index) => {
          return <Option 
          key={index}
          option={option}
          type={type}
          parameterKey={parameterKey}
          index={index}
          urlParams={urlParams}
          />
        })}
      </div>
    </div>
  );
}


function Option(props) {
  const navigate = useNavigate();
  const option = props.option;
  const type = props.type;
  let parameterKey = props.parameterKey;
  const index = props.index;
  const urlParams = props.urlParams;
  let isChecked = false;

  let value;
  if (type === 'single') {
    const optionKeys = Object.keys(option.value);
    value = `${option.value[optionKeys[0]]}-${option.value[optionKeys[1]]}`;
  } else {
    value = option.value;
  }

  if (urlParams.get(parameterKey)) {
    const queryValueList = urlParams.get(parameterKey).split(',');

    // console.log(queryValueList)
    for (let queryValue of queryValueList) {
      if (queryValue === value) {
        isChecked = true;
      }
    }
  }

  if (parameterKey === 'price' || parameterKey === 'screenSize') {
    const queryValue = urlParams.get('min' + parameterKey.charAt(0).toUpperCase() + parameterKey.slice(1));
    if (queryValue === value.split('-')[0]) {
      isChecked = true;
    }
  }


  return (
    <div key={index} className='flex items-center w-auto mb-[2px]'>
      {type === 'single' ? (
        <input
          id={value}
          type='radio'
          checked={isChecked}
          name={parameterKey} // Add a name prop to group the radio buttons
          value={value}
          onChange={() => handleOptionChange(parameterKey, value, navigate)}
          className='cursor-pointer appearance-none w-[14px] h-[14px] rounded-full checked:bg-primary border-primary border-[1px] duration-150'
        />
      ) : (
        <input
          id={value}
          type='checkbox'
          checked={isChecked}
          onChange={() => handleOptionChange(parameterKey, value, navigate)}
          className='cursor-pointer appearance-none w-[14px] h-[14px] rounded-sm checked:bg-primary border-primary border-[1px] duration-150'
        />
      )}
      <label htmlFor={value} className='cursor-pointer ms-2 text-primary font-nunito w-auto min-w-20 hover:font-bold duration-150'>
        {option.name}
      </label>
    </div>
  );
}


const normalzedTitle = (title) => {
  title = title.split(' ').join('');
  title = title.charAt(0).toLowerCase() + title.slice(1);
  return title;
}



// Function to handle option changes
const handleOptionChange = (parameterKey, optionValue, navigate) => {
  // Construct the new URL based on the option selected
  const oldUrl = window.location.search;
  let queryString = oldUrl.split('?')[1];
  let newUrl;
  let queryList = [];
  let queryDict = {};
  let isProcessed = false;
  if (queryString) {
    queryList = queryString.split('&');
    queryDict = listDictConverter(queryList);
  }

  // If the query string already exists, append the new parameter
  if (queryList.length > 0) {
    // If the oprion key value pair already exists, remove it
    queryDict, isProcessed = removeExistingKeyValue(parameterKey, optionValue, queryDict);
    
    // If the option key is already existing, merge the new value
    if (!isProcessed) {
      queryDict, isProcessed = mergeExistingKey(parameterKey, optionValue, queryDict);
    }

    // Range Value need to be processed differently
    if (parameterKey === 'price' || parameterKey === 'screenSize') {
      queryDict, isProcessed = processRangeValue(parameterKey, optionValue, queryDict);
    }

    // Convert the dict back to list
    queryList = listDictConverter(queryDict);
    
    // If the option is fresh new, add it to the query list
    if (!isProcessed) {
      queryList.push(`${parameterKey}=${optionValue}`);
    }

    // Join the query list to form the new query string
    queryString = queryList.join('&');

    // If there is no query string, remove the '?' from the URL
    if (queryString === '') {
      newUrl = window.location.pathname;
    }

    // If there is a query string, use it to form the new URL
    if (queryString !== '') {
      newUrl = `${window.location.pathname}?${queryString}`;
    }

    // filter out the pagination from the new URL
    newUrl = newUrl.replace(/pagination=\d+&?/g, '');

  }

  // If there is no query string and the option is not a duplicate, add the option to the URL
  if (queryList.length === 0 && !isProcessed) {
    if (parameterKey === 'price' || parameterKey === 'screenSize') {
      queryDict, isProcessed = processRangeValue(parameterKey, optionValue, queryDict);
      queryList = listDictConverter(queryDict);
      queryString = queryList.join('&');
      // remove pagination from the query string
      queryString = queryString.replace(/pagination=\d+&?/g, '');
      newUrl = `${window.location.pathname}?${queryString}`;
    } else {
      queryString = `${parameterKey}=${optionValue}`;
      // remove pagination from the query string
      queryString = queryString.replace(/pagination=\d+&?/g, '');
      newUrl = `${window.location.pathname}?${queryString}`;
    }
  }

  // console.log(newUrl)
  // Use navigate to update the URL without refreshing the page
  navigate(newUrl, { replace: true });
};


const listDictConverter = (listOrDict) => {
  // If is a list, convert to dict
  // key is string, value is array
  if (Array.isArray(listOrDict)) {
    let dict = {};
    for (let item of listOrDict) {
      let isMultiple = false;
      let key = item.split('=')[0];
      let value = item.split('=')[1];

      // Handle range values
      if (key === 'price' || key === 'screenSize') {
        value = value.split('-');
        isMultiple = true;
      }

      // Handle multiple values
      if (value.includes(',')) {
        value = value.split(',');
        isMultiple = true;
      }

      const existingValue = dict[key];
      if (existingValue && isMultiple) {
        const newValue = [...existingValue, ...value];
        dict[key] = newValue;
      }

      if (existingValue && !isMultiple) {
        const newValue = [...existingValue, value];
        dict[key] = newValue;
      }

      if (!existingValue && isMultiple) {
        dict[key] = [...value];
      }

      if (!existingValue && !isMultiple) {
        dict[key] = [value];
      }
    }
    return dict;
  }

  // If is a dict, convert to list
  if (typeof listOrDict === 'object') {
    let newList = [];
    const parameterList = Object.keys(listOrDict);
    for (let parameter of parameterList) {
      let valueList = listOrDict[parameter];

      // Handle range values for price and screenSize
      if (parameter === 'minPrice' || parameter === 'maxPrice' || parameter === 'minScreenSize' || parameter === 'maxScreenSize') {
        newList.push(`${parameter}=${valueList}`);
      } else {
        valueList = valueList.join(',');
        newList.push(`${parameter}=${valueList}`);
      }
    }
    return newList;
  }
}


// Remove the existing key value pair
const removeExistingKeyValue = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;

  if (queryDict[parameterKey]) {
    // If the option key value pair already exists, remove it
    let existingValueList = queryDict[parameterKey];
    optionValue = optionValue.replace(' ', '%20');
    if (existingValueList.includes(optionValue)) {
      existingValueList.splice(existingValueList.indexOf(optionValue), 1);
      queryDict[parameterKey] = existingValueList;
      isProcessed = true;
    }

    // If the option key value pair is empty, remove it
    if (existingValueList.length === 0) {
      delete queryDict[parameterKey];
    }
  }
  return queryDict, isProcessed;
}

// Merge the new value to the existing key
const mergeExistingKey = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;
  let existingValueList = queryDict[parameterKey];
  const isRange = parameterKey === 'price' || parameterKey === 'screenSize';
  if (existingValueList && isRange) {
    optionValue = optionValue.split('-');
    existingValueList.push(...optionValue);
    queryDict[parameterKey] = existingValueList;
    isProcessed = true;
  }

  if (existingValueList && !isRange) {
    existingValueList.push(optionValue);
    queryDict[parameterKey] = existingValueList;
    isProcessed = true;
  }
  return queryDict, isProcessed;
}

// Process range values
const processRangeValue = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;
  
  // get the min and max value
  let minKey = `min${parameterKey.charAt(0).toUpperCase()}${parameterKey.slice(1)}`;
  let maxKey = `max${parameterKey.charAt(0).toUpperCase()}${parameterKey.slice(1)}`;

  let newMinValue = optionValue.split('-')[0];
  let newMaxValue = optionValue.split('-')[1];
  
  queryDict[minKey] = newMinValue;
  queryDict[maxKey] = newMaxValue;

  delete queryDict[parameterKey];
  isProcessed = true;
  return queryDict, isProcessed;
}


// React Joyride steps
const steps = [
  {
    target: '.step-one',
    content: 'This is a search bar, you can type keyword here to search for products.',
    disableBeacon: true,
  },
  {
    target: '.step-two',
    content: 'Here you can select filters to narrow down your search results.',
    placement: 'right',
    disableScrolling: true,
  },
  {
    target: '.step-five',
    content: 'View the task instructions and scenario here.',
  },
  {
    target: '.step-six',
    content: 'Launch the interactive website tour for a quick walkthrough.',
  },
  {
    target: '.step-seven',
    content: 'Track your task time here, don\'t worry, it will start after you finish this tour.',
  },
]

export default GUIPage;
