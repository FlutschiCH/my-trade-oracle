import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PromptInputAreaProps {
  onSubmit: (prompt: string) => void;
}

export const PromptInputArea = ({ onSubmit }: PromptInputAreaProps) => {
  const [prompt, setPrompt] = useState<string>('');

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt(''); // Clear the input after submission
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Label htmlFor="prompt-input" className="text-foreground">Enter your trading prompt:</Label>
      <Textarea
        id="prompt-input"
        placeholder="e.g., 'Show me Apple stock price for the last year' or 'Bitcoin vs USD today'"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-grow min-h-[150px] bg-input text-foreground border-border focus-visible:ring-primary"
      />
      <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        Get Insight
      </Button>
    </div>
  );
};