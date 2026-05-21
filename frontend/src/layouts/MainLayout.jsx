import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const MainLayout = () => {
  const location = useLocation();

  // Hide navbar & footer on login/signup pages
  const hideLayout =
    location.pathname === '/login' ||
    location.pathname === '/signup';

  return (
    <div className="min-h-screen flex flex-col">

      {!hideLayout && <Navbar />}

      <main className="flex-grow">
        <Outlet />
      </main>

      {!hideLayout && <Footer />}

    </div>
  );
};

export default MainLayout;
