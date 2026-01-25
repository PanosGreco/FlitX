import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Ask me anything..." }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className={cn(
        "relative flex items-end gap-2",
        "bg-white",
        "border border-gray-200",
        "rounded-2xl",
        "p-3 pr-3"
      )}>
        <div className="flex-shrink-0 pl-2 pb-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent",
            "text-gray-900 placeholder:text-gray-400",
            "focus:outline-none",
            "py-2",
            "text-sm",
            "disabled:opacity-50"
          )}
        />
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className={cn(
            "flex-shrink-0",
            "w-9 h-9 rounded-xl",
            "bg-gradient-to-br from-blue-500 to-blue-600",
            "flex items-center justify-center",
            "text-white",
            "shadow-md shadow-blue-500/20",
            "hover:shadow-lg hover:shadow-blue-500/30",
            "hover:scale-105",
            "active:scale-95",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
