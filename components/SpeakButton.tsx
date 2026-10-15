"use client";

import { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { speak, stop, useSpeech } from "@/lib/speech";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SpeakButtonProps {
  /** Unique per word — identifies what is playing. */
  id: string;
  /** The Chinese characters to speak. */
  text: string;
  size?: number;
  className?: string;
}

export function SpeakButton({ id, text, size = 16, className }: SpeakButtonProps) {
  const { status, playing } = useSpeech(id);

  // Stop this word's audio if its card goes away (tab switch, next flashcard, delete)
  useEffect(() => () => stop(id), [id]);

  if (status === "unsupported") return null;
  const noVoice = status === "no-voice";

  const notifyNoVoice = () =>
    toast("No Mandarin voice on this device", {
      description: "Add a Chinese (China mainland) voice in your device's speech or language settings.",
    });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't flip a hidden card
    if (noVoice) return notifyNoVoice();
    const result = speak(id, text, () =>
      toast.error("Couldn't play audio", { description: "Your browser's speech engine didn't respond. Try again." }),
    );
    if (result === "unavailable") notifyNoVoice();
  };

  const label = playing ? `Stop pronunciation of ${text}` : `Play pronunciation of ${text}`;

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        data-speak-button=""
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors",
          "text-faded hover:bg-gold/10 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/50",
          playing && "bg-gold/10 text-gold",
          noVoice && "opacity-40",
          className,
        )}
      >
        <Volume2 size={size} className={cn(playing && "motion-safe:animate-pulse")} />
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{noVoice ? "No Mandarin voice installed" : playing ? "Stop" : "Play pronunciation"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
