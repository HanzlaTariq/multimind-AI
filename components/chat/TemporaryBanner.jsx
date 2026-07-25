import { EyeOff } from "lucide-react";

export default function TemporaryBanner() {
  return (
    <div className="flex items-center justify-center gap-1.5 border-b border-signal/20 bg-signal/5 px-4 py-2 text-center text-xs text-signal">
      <EyeOff className="h-3.5 w-3.5 shrink-0" />
      Temporary Chat — this conversation won't be saved to your history.
    </div>
  );
}