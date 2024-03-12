import {createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react'
import { UserSessionProvider } from './context/UserSessionContext'

import './App.css'
import 'react-toastify/dist/ReactToastify.css';
import Layout from './layout/Layout'
import ChatPage from './page/Chat'

const router = createBrowserRouter([
  {
    path: '/chat',
    children: [
      { path: '', element: <ChatPage/>},
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
