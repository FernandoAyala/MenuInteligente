interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, userName = "Asistente" }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-medium">AI</span>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{userName}</span>
          <span className="text-xs text-text-secondary">está escribiendo...</span>
        </div>
        
        <div className="flex gap-1 items-center bg-message-incoming px-3 py-2 rounded-lg">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;