import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, MapPin, LogOut, User as UserIcon } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-brand-600" : "text-slate-600 hover:text-slate-900"
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <MapPin className="size-5 text-brand-600" />
          CityWish
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Trending
          </NavLink>
          <NavLink to="/discover" className={navLinkClass}>
            Discover
          </NavLink>
          <NavLink to="/requests/new" className={navLinkClass}>
            Request a Business
          </NavLink>
          {(user?.role === "business_rep" || user?.role === "admin") && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Business Dashboard
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <UserIcon className="size-4" />
                {user.name.split(" ")[0]}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="p-2 text-slate-600 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Trending
            </NavLink>
            <NavLink to="/discover" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Discover
            </NavLink>
            <NavLink to="/requests/new" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Request a Business
            </NavLink>
            {(user?.role === "business_rep" || user?.role === "admin") && (
              <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Business Dashboard
              </NavLink>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserIcon className="size-4" />
                    {user.name}
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="size-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full">
                      Sign up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
