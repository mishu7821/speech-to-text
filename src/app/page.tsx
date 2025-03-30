import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Speech to Text Converter
            </h1>
            <ThemeToggle />
          </div>
          <p className="text-lg text-muted-foreground">
            Convert your speech to text in real-time with our advanced speech recognition technology
          </p>
          <Separator className="mt-6" />
        </header>

        <main>
          <section className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Easy to Use Speech Recognition</h2>
              <p className="text-muted-foreground">
                Our app uses advanced speech recognition technology to convert your spoken words into text instantly.
                Perfect for note-taking, content creation, and accessibility.
              </p>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Features:</h3>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Real-time speech-to-text conversion</li>
                  <li>Save and organize your transcripts</li>
                  <li>Edit and export your text</li>
                  <li>Multi-language support</li>
                  <li>User-friendly interface</li>
                </ul>
              </div>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/demo" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium text-center"
                >
                  Try Demo
                </Link>
                <Link 
                  href="/login" 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-md font-medium text-center"
                >
                  Log In
                </Link>
                <Link 
                  href="/register" 
                  className="bg-muted hover:bg-muted/90 px-6 py-3 rounded-md font-medium text-center"
                >
                  Register
                </Link>
              </div>
            </div>
            
            <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Demo Mode Limitations:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Maximum 30 seconds recording time</li>
                    <li>Cannot save transcripts</li>
                    <li>Limited to English language</li>
                    <li>Basic features only</li>
                  </ul>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Full Account Benefits:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Unlimited recording time</li>
                    <li>Save and organize transcripts</li>
                    <li>Multi-language support</li>
                    <li>Edit and export options</li>
                    <li>Secure cloud storage</li>
                  </ul>
                </div>
                
                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Register for free to unlock all features
                  </p>
                  <Link 
                    href="/register" 
                    className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
          
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Speak</h3>
                <p className="text-muted-foreground">
                  Simply click the record button and start speaking. Our app will listen to your voice.
                </p>
              </div>
              
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Convert</h3>
                <p className="text-muted-foreground">
                  Our advanced AI instantly converts your speech into accurate text in real-time.
                </p>
              </div>
              
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Save</h3>
                <p className="text-muted-foreground">
                  Your transcripts are automatically saved to your account for easy access anytime.
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="pt-10 border-t border-border text-center text-muted-foreground">
          <p>Built with Next.js, React, and Web Speech API</p>
          <p className="text-sm mt-2">© {new Date().getFullYear()} Speech-to-Text App</p>
        </footer>
      </div>
    </div>
  );
}
