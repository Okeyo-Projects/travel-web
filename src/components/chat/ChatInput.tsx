'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  onRequestLocation: () => void;
}

export function ChatInput({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading,
  onRequestLocation 
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { userLocation } = useChatContext();
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        const form = textareaRef.current?.closest('form');
        if (form) {
          form.requestSubmit(); 
        }
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className={cn(
        "relative flex flex-col bg-background border rounded-2xl shadow-sm transition-all duration-200",
        isFocused ? "border-primary/50 ring-2 ring-primary/10 shadow-md" : "border-border"
      )}>
        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Posez votre question..."
            className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-base"
            rows={1}
          />
          
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                className={cn("h-8 w-8 rounded-full", userLocation ? "text-emerald-500" : "text-muted-foreground")}
                onClick={onRequestLocation}
                title={userLocation ? "Position activée" : "Partager ma position"}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !input.trim()}
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200",
                input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">
        L'IA peut faire des erreurs. Vérifiez les informations importantes.
      </p>
    </div>
  );
}
