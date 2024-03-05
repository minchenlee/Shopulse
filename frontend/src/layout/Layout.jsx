import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from '../components/Header'

function Layout() {
  return(
    <div className=''>
      <Header />
      <Outlet />
    </div>
  )
}

export default Layout