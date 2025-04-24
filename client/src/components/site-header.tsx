import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

export function SiteHeader() {
  const [location] = useLocation();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2 mr-4">
          <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6H14V10H10V6ZM10 14H14V18H10V14ZM6 10H10V14H6V10ZM14 10H18V14H14V10Z"></path>
          </svg>
          <span className="text-xl font-semibold tracking-tight">
            Vexis Image Training Platform
          </span>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            <Link href="/">
              <Button 
                variant={location === "/" ? "default" : "ghost"}
                className="text-sm font-medium transition-colors"
              >
                Generator
              </Button>
            </Link>
            <Link href="/history">
              <Button 
                variant={location === "/history" ? "default" : "ghost"}
                className="text-sm font-medium transition-colors"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
          </nav>
          
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
