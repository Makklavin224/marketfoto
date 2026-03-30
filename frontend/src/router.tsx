import { createBrowserRouter } from "react-router";
import AuthPage from "./pages/AuthPage";
import PricingPage from "./pages/PricingPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import LandingPage from "./pages/LandingPage";

const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/pricing",
    element: <PricingPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/editor",
        element: <EditorPage />,
      },
      {
        path: "/upload",
        element: <UploadPage />,
      },
      {
        path: "/processing/:imageId",
        element: <ProcessingPage />,
      },
      {
        path: "/payment/success",
        element: <PaymentSuccessPage />,
      },
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
    ],
  },
  {
    path: "/",
    element: <LandingPage />,
  },
]);

export default router;
