import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Camera, Mic, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemCheck {
  name: string;
  status: "checking" | "passed" | "failed";
  icon: any;
  message: string;
}

export default function PreExamCheck({ 
  examTitle, 
  onStart,
  isStarting = false
}: { 
  examTitle: string; 
  onStart: () => void;
  isStarting?: boolean;
}) {
  const [checks, setChecks] = useState<SystemCheck[]>([
    { name: "Camera Access", status: "checking", icon: Camera, message: "Checking camera..." },
    { name: "Microphone Access", status: "checking", icon: Mic, message: "Checking microphone..." },
    { name: "Browser Compatibility", status: "checking", icon: Chrome, message: "Checking browser..." },
  ]);
  const [allPassed, setAllPassed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkSystems();
  }, []);

  const checkSystems = async () => {
    // Check camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      updateCheck("Camera Access", "passed", "Camera working properly");
      
      // Stop the stream after check
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
    } catch (error) {
      updateCheck("Camera Access", "failed", "Camera access denied or unavailable");
    }

    // Check microphone
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      updateCheck("Microphone Access", "passed", "Microphone working properly");
    } catch (error) {
      updateCheck("Microphone Access", "failed", "Microphone access denied or unavailable");
    }

    // Check browser
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);

    if (isChrome || isFirefox || isEdge) {
      updateCheck("Browser Compatibility", "passed", "Browser is compatible");
    } else {
      updateCheck("Browser Compatibility", "failed", "Please use Chrome, Firefox, or Edge");
    }
  };

  const updateCheck = (name: string, status: "passed" | "failed", message: string) => {
    setChecks(prev => {
      const updated = prev.map(check =>
        check.name === name ? { ...check, status, message } : check
      );
      
      // Check if all passed
      const allChecksPassed = updated.every(check => check.status === "passed");
      setAllPassed(allChecksPassed);
      
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-2xl w-full p-4 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold mb-2" data-testid="text-exam-title">
            {examTitle}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-system-check">
            System Compatibility Check
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {checks.map((check) => {
            const Icon = check.icon;
            const StatusIcon = check.status === "passed" ? CheckCircle : check.status === "failed" ? XCircle : null;

            return (
              <div
                key={check.name}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border"
                data-testid={`check-${check.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  check.status === "passed" ? "bg-chart-2/10" :
                  check.status === "failed" ? "bg-destructive/10" :
                  "bg-muted"
                }`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    check.status === "passed" ? "text-chart-2" :
                    check.status === "failed" ? "text-destructive" :
                    "text-muted-foreground"
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">{check.name}</p>
                  <p className={`text-xs sm:text-sm ${
                    check.status === "passed" ? "text-chart-2" :
                    check.status === "failed" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>
                    {check.message}
                  </p>
                </div>

                {StatusIcon && (
                  <StatusIcon className={`h-5 w-5 ${
                    check.status === "passed" ? "text-chart-2" : "text-destructive"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Camera Preview */}
        <div className="mb-8">
          <p className="text-sm font-medium mb-2">Camera Preview</p>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-preview"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-medium text-sm sm:text-base mb-2">Before you start:</h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <li>• Ensure you are in a quiet, well-lit environment</li>
            <li>• Do not switch tabs or leave the exam window</li>
            <li>• Keep your face visible to the camera at all times</li>
            <li>• The exam will auto-submit when time expires</li>
          </ul>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!allPassed || isStarting}
          onClick={onStart}
          data-testid="button-start-exam"
        >
          {isStarting ? "Starting Exam..." : allPassed ? "Start Exam" : "System Check In Progress..."}
        </Button>
      </Card>
    </div>
  );
}
