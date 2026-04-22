import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
  addDoc,
  deleteDoc,
  updateDoc,
  deleteField
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import QRCode from "qrcode";
import { 
  Heart, Home, ShoppingBag, Phone, User, X, CheckCircle,
  Copy, ExternalLink, Gift, Plus, Trash2, Edit2, LogIn, LogOut, Camera, Save, Settings, Loader2, Unlock
} from "lucide-react";

// 🔥 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB8upfLS0g-_wwdr4U6_ORVwv34szWhzQ8",
  authDomain: "openhouse-670bc.firebaseapp.com",
  projectId: "openhouse-670bc",
  storageBucket: "openhouse-670bc.firebasestorage.app",
  messagingSenderId: "213476855503",
  appId: "1:213476855503:web:3c1f7a436b032ea72ab1ba",
  measurementId: "G-ZQEVFPXRFE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const IMGBB_API_KEY = "79ef9ddfd36c6bfd3bcfd962c853b7a1"; 

const CHAVE_PIX_DESTINO = "11980973458"; 
const WHATSAPP_CONTATO = "8173145848"; 

// CONFIGURAÇÃO TELEGRAM (Opcional - Grátis e Automático)
const TELEGRAM_BOT_TOKEN = "8637356704:AAFIyLZ-bBTOf-dyQwA0tdsn5m4Kdms7CLY"; // Insira o token do seu bot aqui
const TELEGRAM_CHAT_ID = "-1003883720754";    // IDs de grupos/canais no Telegram sempre começam com - ou -100

function crc16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < data.length; i++) {
    let b = data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      let bit = ((b >> (7 - j) & 1) === 1);
      let c15 = ((crc >> 15 & 1) === 1);
      crc <<= 1;
      if (c15 ^ bit) crc ^= polynomial;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(key, amount, name = "CHA DE CASA NOVA", city = "SAO PAULO") {
  const payload = [
    "000201", "26", "33", "0014br.gov.bcb.pix", `01${key.length.toString().padStart(2, '0')}${key}`,
    "52040000", "5303986", amount ? `54${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}` : "",
    "5802BR", `59${name.length.toString().padStart(2, '0')}${name}`, `60${city.length.toString().padStart(2, '0')}${city}`,
    "62070503***", "6304"
  ].join("");
  return payload + crc16(payload); 
}

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showUserAdmin, setShowUserAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // States para Reserva
  const [selecionado, setSelecionado] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixCopiaECola, setPixCopiaECola] = useState("");
  const [whatsappMsg, setWhatsappMsg] = useState("");

  const formatarTelefone = (valor) => {
    let v = valor.replace(/\D/g, ""); // Remove tudo que não é dígito
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 7) {
      v = `${v.slice(0, 2)} ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
    } else if (v.length > 3) {
      v = `${v.slice(0, 2)} ${v.slice(2, 3)} ${v.slice(3)}`;
    } else if (v.length > 2) {
      v = `${v.slice(0, 2)} ${v.slice(2)}`;
    }
    return v;
  };

  // States para CRUD
  const [editando, setEditando] = useState(null);
  const [novoProd, setNovoProd] = useState({ nome: "", valor: "", linkCompra: "", linkImagem: "" });
  const [imgFile, setImgFile] = useState(null);

  // States para Login/Usuarios
  const [emailLogin, setEmailLogin] = useState("");
  const [passLogin, setPassLogin] = useState("");

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "produtos"), (snap) => {
      setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const unsubUsers = onSnapshot(collection(db, "usuarios"), (snap) => {
          setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubUsers();
      }
    });

    return () => { unsubProd(); unsubAuth(); };
  }, []);

  const handleLogin = async () => {
    if (!emailLogin || !passLogin) return alert("Preencha os campos.");
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, emailLogin, passLogin);
      setTimeout(() => {
        setShowLogin(false);
        setIsLoggingIn(false);
        setEmailLogin("");
        setPassLogin("");
      }, 500);
    } catch (e) { 
      alert("Erro no login: " + e.message);
      setIsLoggingIn(false);
    }
  };

  const uploadImageToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Erro no upload para ImgBB");
  };

  const salvarProduto = async () => {
    if (!novoProd.nome || !novoProd.valor) return alert("Preencha os campos básicos");
    setLoading(true);
    try {
      let url = novoProd.linkImagem;
      if (imgFile) url = await uploadImageToImgBB(imgFile);

      const dados = { 
        ...novoProd, 
        valor: parseFloat(novoProd.valor), 
        linkImagem: url || "https://via.placeholder.com/400x400?text=Presente" 
      };

      if (editando) {
        await updateDoc(doc(db, "produtos", editando.id), dados);
        setEditando(null);
      } else {
        await addDoc(collection(db, "produtos"), { 
          ...dados, 
          reservado: false, 
          dataCriacao: serverTimestamp() 
        });
      }
      setNovoProd({ nome: "", valor: "", linkCompra: "", linkImagem: "" });
      setImgFile(null);
      setIsAdminMode(false);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const deletarProduto = async (id) => {
    if (confirm("Deseja apagar este presente?")) {
      await deleteDoc(doc(db, "produtos", id));
    }
  };

  const removerReserva = async (id) => {
    if (confirm("Deseja liberar este presente para outra pessoa reservar?")) {
      try {
        await updateDoc(doc(db, "produtos", id), {
          reservado: false,
          reservadoPor: deleteField(),
          telefone: deleteField(),
          dataReserva: deleteField()
        });
      } catch (e) { alert("Erro ao remover reserva: " + e.message); }
    }
  };

  const reservar = async () => {
    if (!nome || !telefone) return alert("Por favor, preencha seu nome e telefone.");
    setLoading(true);
    try {
      const ref = doc(db, "produtos", selecionado.id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (snap.data().reservado) throw "Já reservado!";
        transaction.update(ref, {
          reservado: true,
          reservadoPor: nome,
          telefone,
          dataReserva: serverTimestamp()
        });
      });
      const payload = generatePixPayload(CHAVE_PIX_DESTINO, parseFloat(selecionado.valor));
      setPixCopiaECola(payload);
      setQr(await QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: "#be185d", light: "#ffffff" } }));
      
      const msg = 
        `*RESERVA DE PRESENTE - NOSSO NOVO LAR*\n\n` +
        `Olá! Acabei de reservar um presente:\n\n` +
        `*Item:* ${selecionado.nome}\n` +
        `*Valor:* R$ ${selecionado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `*Link:* ${selecionado.linkCompra || 'N/A'}\n\n` +
        `*CHAVE PIX (Copia e Cola):*\n${payload}\n\n` +
        `*Reservado por:* ${nome}`;

        
      
      setWhatsappMsg(encodeURIComponent(msg));

      // Notificação Automática via Telegram (Ocorre em background)
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const text = encodeURIComponent(
          `🔔 *NOVA RESERVA!*\n\n` +
          `👤 *De:* ${nome}\n` +
          `📱 *WhatsApp:* ${telefone}\n` +
          `🎁 *Presente:* ${selecionado.nome}\n` +
          `💰 *Valor:* R$ ${selecionado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        );
        
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${text}&parse_mode=Markdown`)
          .then(res => res.json())
          .then(data => {
            if (!data.ok) console.error("Erro no Telegram:", data.description);
          })
          .catch(err => console.error("Erro ao conectar ao Telegram:", err));
      }

    } catch (e) { alert(e); }
    setLoading(false);
  };

  const criarUsuarioAction = async () => {
    const email = prompt("E-mail do novo admin:");
    if (!email) return;
    try {
      await addDoc(collection(db, "usuarios"), { email, dataCriacao: serverTimestamp() });
      alert("Usuário adicionado à lista.");
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="min-h-screen bg-pink-50 font-sans text-slate-900 pb-20 selection:bg-pink-200">
      {/* Botões Admin Flutuantes */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40 animate-in slide-in-from-right duration-500">
        {user ? (
          <>
            <button 
              onClick={() => setShowUserAdmin(true)} 
              title="Gerenciar Usuários"
              className="bg-slate-800 text-white p-4 rounded-full shadow-2xl hover:bg-slate-900 transition-all hover:scale-110 active:scale-95 group cursor-pointer"
            >
              <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => { setIsAdminMode(true); setEditando(null); setNovoProd({ nome: "", valor: "", linkCompra: "", linkImagem: "" }); }} 
              title="Novo Presente"
              className="bg-pink-600 text-white p-4 rounded-full shadow-2xl hover:bg-pink-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button 
              onClick={() => signOut(auth)} 
              title="Sair"
              className="bg-white text-pink-600 p-4 rounded-full shadow-2xl border border-pink-100 hover:bg-pink-50 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => setShowLogin(true)} 
            className="bg-pink-600 text-white p-4 rounded-full shadow-2xl hover:bg-pink-700 transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group cursor-pointer"
          >
            <LogIn className="w-6 h-6" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">Admin</span>
          </button>
        )}
      </div>

      {/* Header Estilo Delicado */}
      <header className="bg-white border-b border-pink-100 py-8 md:py-12 px-6 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-200 via-pink-400 to-pink-200 opacity-50"></div>
        <div className="max-w-3xl mx-auto relative animate-in fade-in zoom-in duration-1000">
          
          {/* Foto do Casal Personalizada */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-pink-400 to-pink-200 rounded-[2rem] rotate-3 opacity-30 blur-sm"></div>
            <div className="relative w-32 h-40 md:w-44 md:h-56 overflow-hidden rounded-[1.8rem] shadow-xl border-4 border-white transform hover:rotate-0 transition-transform duration-500 -rotate-3">
              <img 
                src="https://i.ibb.co/3DtKJFG/DSC03661.jpg" 
                alt="Ialy e Klaiven"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://i.ibb.co/680L6Xg/IMG-20240324-152207.jpg"; // Alternativa caso falhe
                }}
              />
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-bold text-pink-800 mb-2 tracking-tight text-nowrap">Ialy & Klaiven</h1>
          <p className="text-lg md:text-xl font-medium text-pink-600 mb-4 italic">Nosso Chá de Casa Nova</p>
          <p className="text-sm md:text-base text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
            "Estamos começando um novo capítulo da nossa história indo morar juntos! Criamos essa lista para você fazer parte desse momento especial da nossa vida."
          </p>
          
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="h-[1px] w-10 bg-pink-200"></div>
            <Heart className="text-pink-300 fill-pink-300 w-4 h-4 animate-pulse" />
            <div className="h-[1px] w-10 bg-pink-200"></div>
          </div>
        </div>
      </header>

      {/* Grid de Produtos */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12 animate-in fade-in slide-in-from-bottom duration-1000">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {produtos.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="w-8 h-8 text-pink-300 animate-spin mx-auto mb-4" />
              <p className="text-pink-300 text-sm font-medium italic">Preparando a lista com carinho...</p>
            </div>
          ) : (
            produtos.map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-pink-50 flex flex-col relative group hover:-translate-y-1"
              >
                {user && (
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-1 group-hover:translate-y-0">
                    {p.reservado && (
                      <button 
                        onClick={() => removerReserva(p.id)} 
                        className="bg-white/90 p-2 rounded-full text-orange-500 shadow-md hover:bg-orange-50 hover:scale-110 active:scale-95 cursor-pointer"
                        title="Liberar Reserva"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.linkCompra && (
                      <a 
                        href={p.linkCompra}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/90 p-2 rounded-full text-emerald-500 shadow-md hover:bg-emerald-50 hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Ver na Loja"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button 
                      onClick={() => { setEditando(p); setNovoProd(p); setIsAdminMode(true); }} 
                      className="bg-white/90 p-2 rounded-full text-blue-500 shadow-md hover:bg-blue-50 hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => deletarProduto(p.id)} 
                      className="bg-white/90 p-2 rounded-full text-red-500 shadow-md hover:bg-red-50 hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="relative h-40 md:h-64 overflow-hidden">
                  <img 
                    src={p.linkImagem || "https://via.placeholder.com/400x400?text=Presente"} 
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  {p.reservado && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="bg-white/90 px-3 md:px-6 py-1 md:py-2 rounded-full shadow-md border border-pink-100">
                        <span className="text-[10px] md:text-xs font-black text-pink-600 uppercase tracking-widest">Reservado</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-8 flex-grow flex flex-col text-center">
                  <h2 className="text-sm md:text-xl font-bold text-slate-800 mb-1 md:mb-2 leading-tight line-clamp-2">{p.nome}</h2>
                  <p className="text-pink-600 font-black text-base md:text-2xl mb-3 md:mb-6 tracking-tight">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-auto">
                    {p.reservado ? (
                      <div className="bg-pink-50 p-2 md:p-4 rounded-xl md:rounded-2xl border border-pink-100 text-[10px] md:text-sm">
                        <p className="text-pink-300 uppercase font-bold text-[8px] md:text-[10px] mb-0.5 md:mb-1 tracking-widest">Escolhido por</p>
                        <p className="text-pink-700 font-bold truncate">{p.reservadoPor}</p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelecionado(p)} 
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 md:py-4 rounded-xl md:rounded-2xl shadow-md hover:shadow-pink-200 transition-all flex items-center justify-center gap-1.5 md:gap-2 active:scale-95 text-xs md:text-base cursor-pointer"
                      >
                        <Gift className="w-4 h-4 md:w-5 h-5" /> Presentear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL LOGIN COM ANIMAÇÃO */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className={`bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-full max-w-sm shadow-2xl transition-all duration-500 transform ${isLoggingIn ? 'scale-95 opacity-50' : 'scale-100'}`}>
            <div className="bg-pink-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
              <LogIn className="w-8 h-8 md:w-10 md:h-10 text-pink-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-6 md:mb-8">Olá, Admin!</h2>
            <div className="space-y-3 md:space-y-4">
              <input 
                type="email" 
                placeholder="E-mail" 
                value={emailLogin} 
                onChange={e => setEmailLogin(e.target.value)} 
                className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 transition-all text-center text-sm md:text-base" 
              />
              <input 
                type="password" 
                placeholder="Senha" 
                value={passLogin} 
                onChange={e => setPassLogin(e.target.value)} 
                className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 transition-all text-center text-sm md:text-base" 
              />
              <button 
                onClick={handleLogin} 
                disabled={isLoggingIn}
                className="w-full bg-pink-600 text-white font-bold py-4 md:py-5 rounded-xl md:rounded-2xl hover:bg-pink-700 transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl active:scale-95 disabled:opacity-50 text-sm md:text-base"
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 md:w-6 h-6 animate-spin" /> : "Acessar Painel"}
              </button>
              <button onClick={() => setShowLogin(false)} className="w-full text-slate-400 font-bold py-2 text-xs md:text-sm hover:text-slate-600 transition-colors">Voltar para o site</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRUD PRODUTO (ImgBB API) */}
      {isAdminMode && (
        <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="bg-pink-50 p-6 md:p-8 flex justify-between items-center border-b border-pink-100">
              <h2 className="text-xl md:text-2xl font-bold text-pink-800">{editando ? "Editar Presente" : "Novo Presente"}</h2>
              <button onClick={() => setIsAdminMode(false)} className="p-2 hover:bg-pink-200 rounded-full transition-colors">
                <X className="text-pink-400 w-5 h-5 md:w-6 h-6" />
              </button>
            </div>
            <div className="p-6 md:p-10 space-y-4 md:space-y-6">
              <div className="flex justify-center">
                <label className="cursor-pointer group relative w-full h-32 md:h-48 bg-pink-50 border-4 border-dashed border-pink-100 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center hover:bg-pink-100 transition-all overflow-hidden shadow-inner">
                  {imgFile || novoProd.linkImagem ? (
                    <img 
                      src={imgFile ? URL.createObjectURL(imgFile) : novoProd.linkImagem} 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : null}
                  <div className="z-10 flex flex-col items-center">
                    <Camera className="w-8 h-8 md:w-10 md:h-10 text-pink-300 mb-1 md:mb-2" />
                    <span className="text-[10px] md:text-sm text-pink-400 font-black uppercase tracking-widest text-center">Enviar Foto</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={e => setImgFile(e.target.files[0])} />
                </label>
              </div>
              <div className="space-y-3 md:space-y-4">
                <input 
                  placeholder="Nome do Produto" 
                  value={novoProd.nome} 
                  onChange={e => setNovoProd({...novoProd, nome: e.target.value})} 
                  className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 transition-all text-sm md:text-base" 
                />
                <div className="flex gap-3 md:gap-4">
                  <input 
                    type="number" 
                    placeholder="Valor R$" 
                    value={novoProd.valor} 
                    onChange={e => setNovoProd({...novoProd, valor: e.target.value})} 
                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 transition-all text-sm md:text-base" 
                  />
                  <input 
                    placeholder="Link da Loja" 
                    value={novoProd.linkCompra} 
                    onChange={e => setNovoProd({...novoProd, linkCompra: e.target.value})} 
                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 transition-all text-sm md:text-base" 
                  />
                </div>
              </div>
              <button 
                disabled={loading} 
                onClick={salvarProduto} 
                className="w-full bg-pink-600 text-white font-bold py-4 md:py-5 rounded-xl md:rounded-[1.5rem] shadow-xl hover:bg-pink-700 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95 disabled:opacity-50 text-sm md:text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 md:w-6 h-6 animate-spin" /> : <><Save className="w-4 h-4 md:w-5 h-5" /> Salvar na Lista</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTÃO USUÁRIOS */}
      {showUserAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">Administradores</h2>
              <button 
                onClick={criarUsuarioAction} 
                className="bg-pink-100 text-pink-600 px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-pink-200 transition-colors"
              >
                + Novo
              </button>
            </div>
            <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-72 overflow-y-auto pr-2 mb-6 md:mb-8 custom-scrollbar">
              {usuarios.map(u => (
                <div key={u.id} className="flex justify-between items-center p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-[1.5rem] border border-slate-100 group">
                  <span className="text-xs md:text-sm font-bold text-slate-600 truncate mr-2">{u.email}</span>
                  <button 
                    onClick={() => { if(confirm("Remover acesso?")) deleteDoc(doc(db, "usuarios", u.id)) }} 
                    className="text-red-300 hover:text-red-500 p-1.5 md:p-2 hover:bg-red-50 rounded-full transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowUserAdmin(false)} 
              className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs md:text-sm"
            >
              Fechar Configurações
            </button>
          </div>
        </div>
      )}

      {/* MODAL RESERVA */}
      {selecionado && !qr && (
        <div className="fixed inset-0 bg-pink-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden p-6 md:p-10 text-center animate-in slide-in-from-bottom duration-500 relative">
            <button 
              onClick={() => setSelecionado(null)}
              className="absolute top-4 right-4 p-2 hover:bg-pink-50 rounded-full transition-colors cursor-pointer text-pink-300 hover:text-pink-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-pink-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Gift className="w-8 h-8 md:w-10 md:h-10 text-pink-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-pink-800 mb-1 md:mb-2">Quase lá!</h2>
            <p className="text-sm md:text-base text-pink-400 mb-6 md:mb-8 italic">Você escolheu presentear com: <br/><span className="font-bold text-pink-600">"{selecionado.nome}"</span></p>
            
            <div className="space-y-3 md:space-y-4">
              <input 
                placeholder="Seu nome completo" 
                className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 text-center text-sm md:text-base" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
              />
              <input 
                placeholder="Seu WhatsApp (81 9 0000-0000)" 
                className="w-full p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-pink-100 text-center text-sm md:text-base" 
                value={telefone} 
                onChange={e => setTelefone(formatarTelefone(e.target.value))} 
              />
              <button 
                disabled={loading} 
                className="w-full bg-pink-600 text-white font-bold py-4 md:py-5 rounded-xl md:rounded-2xl shadow-xl hover:bg-pink-700 transition-all active:scale-95 disabled:opacity-50 text-sm md:text-base cursor-pointer" 
                onClick={reservar}
              >
                {loading ? <Loader2 className="w-5 h-5 md:w-6 h-6 animate-spin mx-auto" /> : "Confirmar Presente"}
              </button>
              <button onClick={() => setSelecionado(null)} className="w-full py-1 text-slate-300 font-bold text-xs md:text-sm cursor-pointer">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUCESSO / PIX */}
      {qr && (
        <div className="fixed inset-0 bg-pink-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl w-full max-w-sm overflow-hidden text-center animate-in slide-in-from-bottom duration-500 relative">
            <button 
              onClick={() => { setQr(""); setSelecionado(null); setNome(""); setTelefone(""); setWhatsappMsg(""); }}
              className="absolute top-4 right-4 p-2 hover:bg-pink-50 rounded-full transition-colors cursor-pointer text-pink-300 hover:text-pink-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-pink-600 p-6 md:p-10 text-white text-center">
              <div className="bg-white/20 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="w-10 h-10 md:w-12 h-12 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Muito Obrigado!</h2>
              <p className="text-sm md:text-base opacity-90 italic">Sua escolha nos deixou muito felizes.</p>
            </div>
            <div className="p-6 md:p-10">
              <div className="bg-pink-50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed border-pink-100 mb-6 md:mb-8 inline-block shadow-inner">
                <img src={qr} className="w-36 h-36 md:w-48 h-48 mx-auto rounded-xl" />
              </div>
              <div className="space-y-3 md:space-y-4">
                <button 
                  onClick={() => { navigator.clipboard.writeText(pixCopiaECola); alert("Copiado!"); }} 
                  className="w-full border-2 border-pink-100 text-pink-600 font-bold py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-pink-50 transition-all active:scale-95 text-sm md:text-base cursor-pointer"
                >
                  <Copy className="w-4 h-4"/> Copiar Pix
                </button>
                {selecionado.linkCompra && (
                  <a 
                    href={selecionado.linkCompra} 
                    target="_blank" 
                    className="w-full bg-slate-800 text-white font-bold py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-900 transition-all text-sm md:text-base cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4"/> Comprar Online
                  </a>
                )}
                <button 
                  onClick={() => { 
                    window.open(`https://wa.me/55${WHATSAPP_CONTATO}?text=${whatsappMsg}`, "_blank");
                    setQr(""); 
                    setSelecionado(null); 
                    setNome(""); 
                    setTelefone(""); 
                    setWhatsappMsg("");
                  }} 
                  className="w-full text-slate-400 font-black uppercase tracking-widest text-[10px] md:text-xs py-3 md:py-4 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
