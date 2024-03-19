import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react'
import { UserSessionProvider } from './context/UserSessionContext'

import './App.css'
import './components/react-medium-image-zoom.css'
import Layout from './layout/Layout'
import ChatPage from './page/Chat'
import GUIPage from './page/Gui'

const router = createBrowserRouter([
  {
    path: '/chat',
    children: [
      { path: '', element: <ChatPage/>},
    ]
  },
  {
    path: '/gui',
    element: <Layout/>,
    children: [
      { path: '', element: <GUIPage/>},
    ]
  }
])

function App() {
  return (
    <UserSessionProvider>
      <RouterProvider router={router}/>
    </UserSessionProvider>
  )
}
export default App
