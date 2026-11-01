import { useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Contact from './pages/Contact.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import MyTrips from './pages/MyTrips.jsx';
import NotFound from './pages/NotFound.jsx';
import PackageDetail from './pages/PackageDetail.jsx';
import Packages from './pages/Packages.jsx';
import Register from './pages/Register.jsx';
import Saved from './pages/Saved.jsx';
import AdminBookings from './pages/admin/AdminBookings.jsx';
import AdminEnquiries from './pages/admin/AdminEnquiries.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminPackageForm from './pages/admin/AdminPackageForm.jsx';
import AdminPackages from './pages/admin/AdminPackages.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';

function SiteLayout() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo, and an
  // effect must return nothing (or a cleanup function).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn-dark">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="packages" element={<Packages />} />
        <Route path="packages/:slug" element={<PackageDetail />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="trips"
          element={
            <RequireAuth>
              <MyTrips />
            </RequireAuth>
          }
        />
        <Route
          path="saved"
          element={
            <RequireAuth>
              <Saved />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAuth admin>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="packages/new" element={<AdminPackageForm />} />
          <Route path="packages/:id/edit" element={<AdminPackageForm />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
