import muzziniAvatar from '../chefcito.jpg';

interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, userName = "Muzzini" }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full overflow-hidden bg-accent-green flex items-center justify-center flex-shrink-0">
        <img 
          src={muzziniAvatar} 
          alt="Muzzini" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
          <span className="text-xs text-text-secondary">{userName} está escribiendo...</span>
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