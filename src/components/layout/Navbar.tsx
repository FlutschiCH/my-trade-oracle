import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { NavLink } from 'react-router-dom';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6">
      // Applying GLASS, RADIUS, and TYPOGRAPHY tokens to the Navbar container.
      <div className="bg-sky-950/20 border border-sky-400/10 backdrop-blur-xl w-full max-w-7xl px-6 py-3 rounded-[2.5rem] flex items-center justify-between tracking-tight font-medium">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rotate-45" />
          </div>
          <span className="text-white font-bold tracking-tight text-xl">
            Nexus
          </span>
        </div>

        {/* Navigation Links - AI will likely add more here */}
                {/* Navigation Links - Updated to use NavLink for routing */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink
            to="/"
            className="text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors"
          >
            Home
          </NavLink>
          <NavLink
            to="/booking"
            className="text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors"
          >
            Book Session
          </NavLink>
          <NavLink
            to="/dashboard"
            className="text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors"
          >
            Dashboard
          </NavLink>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <NavLink to="/login">
            <Button
              variant="glass"
              className="hidden sm:flex border-none hover:bg-transparent"
            >
              Log in
            </Button>
          </NavLink>
          <NavLink to="/signup">
            <Button variant="primary">Get Started</Button>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};
