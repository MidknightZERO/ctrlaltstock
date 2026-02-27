import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import About from './components/About.tsx'
import TermsOfService from './components/TermsOfService.tsx'
import PrivacyPolicy from './Privacy.tsx'
import BlogHome from './blog/BlogHome.tsx'
import BlogPost from './blog/BlogPost.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'

const LocalEditor = React.lazy(() => import('./blog/LocalEditor.tsx'))
const AdvancedBlogEditor = React.lazy(() => import('./blog/AdvancedBlogEditor.tsx'))

const LazyFallback = (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-gray-400">Loading editor...</div>
  </div>
)

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
    element: <ErrorBoundary><BlogHome /></ErrorBoundary>,
  },
  {
    path: "/blog/editor",
    element: <ErrorBoundary><Suspense fallback={LazyFallback}><LocalEditor /></Suspense></ErrorBoundary>,
  },
  {
    path: "/blog-editor",
    element: <ErrorBoundary><Suspense fallback={LazyFallback}><AdvancedBlogEditor /></Suspense></ErrorBoundary>,
  },
  {
    path: "/blog-editor/:slug",
    element: <ErrorBoundary><Suspense fallback={LazyFallback}><AdvancedBlogEditor /></Suspense></ErrorBoundary>,
  },
  {
    path: "/blog/:slug",
    element: <ErrorBoundary><BlogPost /></ErrorBoundary>,
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>,
)
