import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Navigation, 
  RotateCcw,
  CheckCircle2,
  MapPin
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  rekomendasi_lokasi?: {
    nama: string;
    tipe: string;
    lat: number;
    lng: number;
    jarak_km?: number;
    deskripsi?: string;
  } | null;
  saran_pertanyaan?: string[];
}

interface DisasterChatbotProps {
  userCoords?: { lat: number; lng: number } | null;
  selectedWilayahId?: number | null;
  onFlyToLocation?: (coords: { lat: number; lng: number; zoom?: number }) => void;
  onSelectDestination?: (loc: { lat: number; lng: number; nama: string }) => void;
  isEmbedded?: boolean;
}

const QUICK_PROMPTS = [
  { label: '🏢 Shelter Tsunami', query: 'Di mana shelter evakuasi tsunami terdekat?' },
  { label: '📍 Gempa BMKG', query: 'Bagaimana status gempa bumi terkini?' },
  { label: '⚡ Cuaca & Galodo', query: 'Peringatan cuaca ekstrem dan potensi banjir galodo' },
  { label: '📞 Kontak Darurat', query: 'Nomor telepon darurat BPBD dan SAR' },
];

export const DisasterChatbot: React.FC<DisasterChatbotProps> = ({
  userCoords,
  selectedWilayahId,
  onFlyToLocation,
  onSelectDestination,
  isEmbedded = false
}) => {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo! Saya Asisten Siaga Bencana Sumatera Barat. Saya siap membantu Anda dengan informasi real-time mengenai shelter evakuasi terdekat, pemantauan sensor gempa BMKG, peringatan cuaca ekstrem, dan SOP mitigasi. Ada yang bisa saya bantu?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      saran_pertanyaan: [
        'Di mana shelter tsunami terdekat?',
        'Bagaimana status gempa terkini?',
        'Peringatan cuaca ekstrem hari ini'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ke pesan terbaru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, isEmbedded, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesan: query,
          user_lat: userCoords?.lat || -0.9471,
          user_lng: userCoords?.lng || 100.4172,
          wilayah_id: selectedWilayahId || null
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.jawaban,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        rekomendasi_lokasi: data.rekomendasi_lokasi,
        saran_pertanyaan: data.saran_pertanyaan
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Mohon maaf, saat ini server asisten sedang sibuk. Anda tetap dapat menggunakan menu Evakuasi Sekarang untuk melihat rute aman di peta.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFlyTo = (loc: { lat: number; lng: number }) => {
    if (onFlyToLocation) {
      onFlyToLocation({ lat: loc.lat, lng: loc.lng, zoom: 14.5 });
    }
  };

  const chatContent = (
    <div className={`flex flex-col ${isEmbedded ? 'h-[440px] w-full' : 'w-[92vw] sm:w-[380px] md:w-[410px] h-[520px] max-h-[82vh] rounded-2xl bg-[#09111A]/98 backdrop-blur-2xl border border-cyan-700/40 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in duration-200'}`}>
      {/* Header Panel (Hanya ditampilkan jika bukan embedded) */}
      {!isEmbedded && (
        <div className="px-4 py-3 bg-[#0E1A26] border-b border-[#1C2C3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Asisten Siaga Bencana
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                BPBD Prov. Sumbar & Riset LPPM UPI YPTK
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMessages([{
                id: 'reset',
                sender: 'bot',
                text: 'Percakapan diatur ulang. Silakan pilih topik bantuan kebencanaan yang Anda perlukan.',
                timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                saran_pertanyaan: [
                  'Di mana shelter tsunami terdekat?',
                  'Bagaimana status gempa terkini?',
                  'Peringatan cuaca ekstrem hari ini'
                ]
              }])}
              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors"
              title="Bersihkan riwayat percakapan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Tutup Asisten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="px-3 py-2 bg-[#080E16] border-b border-[#152332] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1 mr-0.5" />
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => handleSendMessage(qp.query)}
            className="px-2.5 py-1 rounded-lg bg-[#111F2D] hover:bg-cyan-950/80 border border-[#223547] hover:border-cyan-500/50 text-[10.5px] font-medium text-slate-300 hover:text-cyan-200 transition-all shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-md ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                  : 'bg-[#121E2C] border border-[#233547] text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* Card Lokasi / Rekomendasi Titik */}
              {m.rekomendasi_lokasi && (
                <div className="mt-2.5 pt-2.5 border-t border-cyan-800/40 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{m.rekomendasi_lokasi.nama}</span>
                  </div>
                  {m.rekomendasi_lokasi.deskripsi && (
                    <div className="text-[10px] text-slate-400">
                      {m.rekomendasi_lokasi.deskripsi}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleFlyTo(m.rekomendasi_lokasi!)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-[10px] font-bold text-cyan-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-cyan-400" />
                      <span>Arahkan Peta</span>
                    </button>
                    {onSelectDestination && (
                      <button
                        type="button"
                        onClick={() => onSelectDestination({
                          lat: m.rekomendasi_lokasi!.lat,
                          lng: m.rekomendasi_lokasi!.lng,
                          nama: m.rekomendasi_lokasi!.nama
                        })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-[10px] font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Pilih Shelter Ini</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Saran Pertanyaan Tambahan */}
              {m.saran_pertanyaan && m.saran_pertanyaan.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1">
                  <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider">
                    Pertanyaan Terkait:
                  </span>
                  {m.saran_pertanyaan.map((sq, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendMessage(sq)}
                      className="text-left text-[10px] text-cyan-400 hover:text-cyan-200 hover:underline transition-colors block"
                    >
                      &rarr; {sq}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
              {m.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121E2C] border border-[#233547] text-cyan-300 text-xs w-fit animate-pulse">
            <Bot className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Memeriksa sensor BMKG & database spasial PostGIS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-[#0A1118] border-t border-[#1C2C3D] flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pertanyaan kebencanaan..."
          disabled={loading}
          className="flex-1 bg-[#121E2C] border border-[#233547] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className={`p-2 rounded-xl transition-all ${
            inputText.trim() && !loading
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md cursor-pointer'
              : 'bg-[#152332] text-slate-600 border border-[#233547] cursor-not-allowed'
          }`}
          title="Kirim Pesan"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  if (isEmbedded) {
    return chatContent;
  }

  return (
    <div className="fixed z-40 bottom-16 right-4 sm:bottom-16 sm:right-6 pointer-events-auto">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#0F2A3F] via-[#123E56] to-[#0D6E6E] hover:from-[#133854] hover:to-[#0F8484] border border-cyan-500/50 shadow-[0_10px_25px_rgba(0,0,0,0.6)] text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Tanya Asisten Virtual Siaga Bencana Sumbar"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
            <Bot className="relative w-5 h-5 text-cyan-300 group-hover:text-white transition-colors" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold font-display uppercase tracking-wider text-cyan-200">
              Asisten Bencana
            </div>
            <div className="text-[10px] text-cyan-400/80 font-mono">Tanya Shelter & Gempa</div>
          </div>
        </button>
      ) : chatContent}
    </div>
  );
};

export default DisasterChatbot;
