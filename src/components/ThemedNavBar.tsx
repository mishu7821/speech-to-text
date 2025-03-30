'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

// Import necessary icons
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Mic, 
  FileText, 
  Home, 
  Trash2
} from 'lucide-react';

// Logo component
const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

type NavBarProps = {
  user: User | null;
  onSignOut?: () => void;
};

export function ThemedNavBar({ user, onSignOut }: NavBarProps) {
  const pathname = usePathname();
  
  const handleSignOut = () => {
    if (onSignOut) onSignOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
            <span className="font-bold">VoiceScribe</span>
          </Link>
        </div>
        
        {/* Mobile logo */}
        <div className="mr-0 flex md:hidden">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Main navigation */}
          <nav className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground", 
                pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="hidden md:inline">Dashboard</span>
              <Home className="h-5 w-5 md:hidden" />
            </Link>
            
            <Link 
              href="/transcripts" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground", 
                pathname === "/transcripts" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="hidden md:inline">Transcripts</span>
              <FileText className="h-5 w-5 md:hidden" />
            </Link>
            
            <Link 
              href="/recorder" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground", 
                pathname === "/recorder" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="hidden md:inline">New Recording</span>
              <Mic className="h-5 w-5 md:hidden" />
            </Link>
            
            <Link 
              href="/trash" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground", 
                pathname === "/trash" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="hidden md:inline">Trash</span>
              <Trash2 className="h-5 w-5 md:hidden" />
            </Link>
          </nav>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            {user ? (
              <UserProfileDropdown user={user} onSignOut={handleSignOut} />
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// User Profile Dropdown Component
function UserProfileDropdown({ user, onSignOut }: { user: User, onSignOut?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || ''} />
            <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.id?.substring(0, 8)}...
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex cursor-pointer items-center">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex cursor-pointer items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="flex cursor-pointer items-center">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 