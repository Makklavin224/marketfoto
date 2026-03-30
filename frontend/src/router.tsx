import { createBrowserRouter } from "react-router";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/editor",
        element: (
          <div className="p-8 text-center text-gray-500">
            Editor — coming in Phase 6
          </div>
        ),
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
    element: (
      <div className="p-8 text-center text-gray-500">
        Landing — coming in Phase 10
      </div>
    ),
  },
]);

export default router;
