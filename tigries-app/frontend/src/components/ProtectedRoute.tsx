import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function ProtectedRoute() {
  const { isLoading, session } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="route-loading">
        <span>Loading...</span>
      </main>
    );
  }

  if (!session) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
