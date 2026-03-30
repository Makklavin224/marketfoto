import { createBrowserRouter } from "react-router";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import EditorPage from "./pages/EditorPage";

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
