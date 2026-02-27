import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import About from './components/About.tsx'
import TermsOfService from './components/TermsOfService.tsx'
import PrivacyPolicy from './Privacy.tsx'
import BlogHome from './blog/BlogHome.tsx'
import BlogPost from './blog/BlogPost.tsx'
import LocalEditor from './blog/LocalEditor.tsx'
import AdvancedBlogEditor from './blog/AdvancedBlogEditor.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/terms-of-service",
    element: <TermsOfService />,
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/blog",
    element: <BlogHome />,
  },
  {
    path: "/blog/editor",
    element: <LocalEditor />,
  },
  {
    path: "/blog-editor",
    element: <AdvancedBlogEditor />,
  },
  {
    path: "/blog-editor/:slug",
    element: <AdvancedBlogEditor />,
  },
  {
    path: "/blog/:slug",
    element: <BlogPost />,
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)