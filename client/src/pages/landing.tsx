import { Button } from "@/components/ui/button";
import { Shield, Brain, Eye, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-app-title">SmartExam Proctor</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" data-testid="text-hero-title">
            Secure Online Examination System
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-hero-description">
            Intelligent AI-powered proctoring with webcam monitoring, question randomization, 
            and real-time supervision to ensure academic integrity.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Sign In to Continue
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">AI-Powered Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              Advanced face detection and behavior analysis to detect anomalies during exams.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Live Proctoring</h3>
            <p className="text-sm text-muted-foreground">
              Real-time webcam monitoring with automatic violation detection and logging.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Question Randomization</h3>
            <p className="text-sm text-muted-foreground">
              Unique question order and shuffled options for each candidate to prevent cheating.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Secure Environment</h3>
            <p className="text-sm text-muted-foreground">
              Tab switch detection, auto-save, and timer validation for exam integrity.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
