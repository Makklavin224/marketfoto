import { createBrowserRouter } from "react-router";
import AuthPage from "./pages/AuthPage";
import PricingPage from "./pages/PricingPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
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
        element: (
          <div className="p-8 text-center text-gray-500">
            Dashboard — coming in Phase 9
          </div>
        ),
      },
    ],
  },
  {
    path: "/",
    element: <LandingPage />,
  },
]);

export default router;
