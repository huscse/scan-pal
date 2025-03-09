'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ScanIcon as ScannerIcon,
  History,
  Settings,
  LogOut,
  BookOpen,
  Brain,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    } else {
      router.push('/auth/sign-in');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Sign Out */}
        <div className="flex justify-end mb-8">
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
              <Brain className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Assignment Scanner AI
            </h1>
            <p className="text-xl text-muted-foreground text-center max-w-2xl">
              Point your camera at any homework problem and get instant
              step-by-step solutions and explanations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mt-8">
            <Card className="p-6 hover:shadow-lg transition-all hover:scale-105 duration-300 border-2">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ScannerIcon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Scan Assignment</h2>
                <p className="text-center text-muted-foreground">
                  Instantly scan and analyze your homework problems
                </p>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                >
                  <Link href="/scan">Start Scanning</Link>
                </Button>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all hover:scale-105 duration-300">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <History className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">History</h2>
                <p className="text-center text-muted-foreground">
                  Access your past scans and conversations
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/history">View History</Link>
                </Button>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all hover:scale-105 duration-300">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Settings className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Settings</h2>
                <p className="text-center text-muted-foreground">
                  Customize your scanning preferences
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/settings">Open Settings</Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="mt-16 w-full max-w-5xl">
            <h2 className="text-2xl font-semibold mb-8 text-center">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-lg bg-card border">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <ScannerIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Point & Scan</h3>
                <p className="text-muted-foreground">
                  Point your device camera at any homework problem
                </p>
              </div>
              <div className="text-center p-6 rounded-lg bg-card border">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
                <p className="text-muted-foreground">
                  Our AI instantly processes and understands the content
                </p>
              </div>
              <div className="text-center p-6 rounded-lg bg-card border">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Get Solutions</h3>
                <p className="text-muted-foreground">
                  Receive detailed explanations and step-by-step solutions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
