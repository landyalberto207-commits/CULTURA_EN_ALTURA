import { Lock, X } from 'lucide-react';

interface LoginOverlayProps {
  onClose: () => void;
  onLogin: () => void;
}

const LoginOverlay = ({ onClose, onLogin }: LoginOverlayProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-[#2C2416] p-8 md:p-12 w-full max-w-md border border-white/10 shadow-2xl flex flex-col items-center animate-fade-in-up">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <Lock className="w-10 h-10 text-[#d4c1b1] mb-5" />
        <h3 className="museo-headline text-white text-2xl mb-2 text-center">Inicia Sesión</h3>
        <p className="museo-body text-white/50 text-center text-sm mb-8">
          Para acceder a los recorridos 3D y compartir historias de la comunidad, por favor inicia sesión o regístrate.
        </p>
        
        <form 
          className="w-full flex flex-col gap-4" 
          onSubmit={(e) => { 
            e.preventDefault(); 
            onLogin(); 
          }}
        >
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4c1b1] transition-colors museo-body placeholder:text-white/30" 
            required 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#d4c1b1] transition-colors museo-body placeholder:text-white/30" 
            required 
          />
          <button 
            type="submit" 
            className="w-full mt-4 bg-[#d4c1b1] text-[#2C2416] py-3 text-[11px] museo-label tracking-[0.2em] hover:bg-white transition-colors"
          >
            ENTRAR
          </button>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <span className="text-white/30 text-xs museo-body">o regístrate</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>
          
          <button 
            type="button"
            className="w-full mt-2 border border-white/20 text-white py-3 text-[11px] museo-label tracking-[0.2em] hover:border-white/50 transition-colors"
          >
            CREAR CUENTA
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginOverlay;