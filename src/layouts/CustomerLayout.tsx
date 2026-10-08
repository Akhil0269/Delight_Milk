import { Outlet } from "react-router-dom";
import Footer from "@/components/Footer";

/**
 * CustomerLayout
 * Wraps all public and customer-facing routes with a full-height container and customer Footer.
 * Ensures the Footer appears only on customer/public pages and stays pinned to the bottom.
 */
const CustomerLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default CustomerLayout;
