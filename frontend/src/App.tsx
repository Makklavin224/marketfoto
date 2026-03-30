import { RouterProvider } from "react-router";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import router from "./router";
import { useAuthStore } from "./stores/auth";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}
